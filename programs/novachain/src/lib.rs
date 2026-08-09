use anchor_lang::prelude::*;

declare_id!("E5tjhztUxbo3Aa6Up8wH4NucXDzhcez56haLm5DbShiw");

// ─────────────────────────────────────────────
//  State definitions
// ─────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Role {
    Admin,
    Faculty,
    Researcher,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EquipmentStatus {
    Available,
    Reserved,
    InUse,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ReservationStatus {
    Pending,
    Approved,
    Rejected,
}

#[account]
pub struct GlobalState {
    pub admin: Pubkey,
    pub merkle_tree: Pubkey,
}

#[account]
pub struct Researcher {
    pub authority: Pubkey,
    pub role: Role,
    pub department: String,
    pub name: String,
    pub sbt_mint: Pubkey,
}

#[account]
pub struct Equipment {
    pub name: String,
    pub category: String,
    pub lab: String,
    pub status: EquipmentStatus,
    pub cnft_asset_id: [u8; 32],
}

#[account]
pub struct Reservation {
    pub equipment_pda: Pubkey,
    pub researcher_pda: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub status: ReservationStatus,
}

// ─────────────────────────────────────────────
//  Error Codes
// ─────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("The equipment is currently not available for reservation.")]
    EquipmentNotAvailable,
    #[msg("Invalid time range: start must be before end.")]
    InvalidTimeRange,
}

// ─────────────────────────────────────────────
//  Program
// ─────────────────────────────────────────────

#[program]
pub mod novachain {
    use super::*;

    /// Initialize the global state and set the admin authority.
    pub fn initialize(ctx: Context<Initialize>, merkle_tree: Pubkey) -> Result<()> {
        let gs = &mut ctx.accounts.global_state;
        gs.admin = ctx.accounts.admin.key();
        gs.merkle_tree = merkle_tree;
        Ok(())
    }

    /// Admin registers a Faculty or Researcher and mints their Soulbound Identity.
    pub fn register_user(
        ctx: Context<RegisterUser>,
        role: Role,
        department: String,
        name: String,
        sbt_mint: Pubkey,
    ) -> Result<()> {
        let r = &mut ctx.accounts.researcher;
        r.authority = ctx.accounts.user_wallet.key();
        r.role = role;
        r.department = department;
        r.name = name;
        r.sbt_mint = sbt_mint;
        // CPI to Token-2022 for NonTransferable mint goes here
        Ok(())
    }

    /// Admin registers lab equipment and mints a Compressed NFT via Bubblegum.
    pub fn register_equipment(
        ctx: Context<RegisterEquipment>,
        name: String,
        category: String,
        lab: String,
        cnft_asset_id: [u8; 32],
    ) -> Result<()> {
        let e = &mut ctx.accounts.equipment;
        e.name = name;
        e.category = category;
        e.lab = lab;
        e.status = EquipmentStatus::Available;
        e.cnft_asset_id = cnft_asset_id;
        // CPI to Bubblegum for cNFT mint goes here
        Ok(())
    }

    /// Researcher requests a reservation for a piece of equipment.
    pub fn create_reservation(
        ctx: Context<CreateReservation>,
        _reservation_id: String,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        require!(start_time < end_time, ErrorCode::InvalidTimeRange);
        require!(
            ctx.accounts.equipment.status == EquipmentStatus::Available,
            ErrorCode::EquipmentNotAvailable
        );
        let res = &mut ctx.accounts.reservation;
        res.equipment_pda = ctx.accounts.equipment.key();
        res.researcher_pda = ctx.accounts.researcher.key();
        res.start_time = start_time;
        res.end_time = end_time;
        res.status = ReservationStatus::Pending;
        Ok(())
    }

    /// Faculty approves or rejects a pending reservation.
    pub fn approve_reservation(ctx: Context<ApproveReservation>, approve: bool) -> Result<()> {
        require!(
            ctx.accounts.faculty.role == Role::Faculty,
            ErrorCode::Unauthorized
        );
        let res = &mut ctx.accounts.reservation;
        let eq = &mut ctx.accounts.equipment;
        if approve {
            res.status = ReservationStatus::Approved;
            eq.status = EquipmentStatus::Reserved;
        } else {
            res.status = ReservationStatus::Rejected;
        }
        Ok(())
    }

    /// Faculty issues a research publication cNFT for a researcher.
    pub fn publish_paper(
        ctx: Context<PublishPaper>,
        _title: String,
        _doi: String,
        _cnft_asset_id: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.faculty.role == Role::Faculty,
            ErrorCode::Unauthorized
        );
        // CPI to Bubblegum for publication cNFT mint goes here
        Ok(())
    }
}

// ─────────────────────────────────────────────
//  Accounts Contexts
// ─────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut, has_one = admin)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: Wallet of the user being registered
    pub user_wallet: UncheckedAccount<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1 + 4 + 64 + 4 + 64 + 32,
        seeds = [b"researcher", user_wallet.key().as_ref()],
        bump
    )]
    pub researcher: Account<'info, Researcher>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterEquipment<'info> {
    #[account(mut, has_one = admin)]
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + 4 + 64 + 4 + 64 + 4 + 64 + 1 + 32,
        seeds = [b"equipment", name.as_bytes()],
        bump
    )]
    pub equipment: Account<'info, Equipment>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(_reservation_id: String)]
pub struct CreateReservation<'info> {
    #[account(mut)]
    pub researcher_wallet: Signer<'info>,
    #[account(constraint = researcher.authority == researcher_wallet.key() @ ErrorCode::Unauthorized)]
    pub researcher: Account<'info, Researcher>,
    #[account(mut)]
    pub equipment: Account<'info, Equipment>,
    #[account(
        init,
        payer = researcher_wallet,
        space = 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"reservation", _reservation_id.as_bytes()],
        bump
    )]
    pub reservation: Account<'info, Reservation>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveReservation<'info> {
    #[account(mut)]
    pub faculty_wallet: Signer<'info>,
    #[account(constraint = faculty.authority == faculty_wallet.key() @ ErrorCode::Unauthorized)]
    pub faculty: Account<'info, Researcher>,
    #[account(
        mut,
        constraint = reservation.equipment_pda == equipment.key() @ ErrorCode::Unauthorized
    )]
    pub reservation: Account<'info, Reservation>,
    #[account(mut)]
    pub equipment: Account<'info, Equipment>,
}

#[derive(Accounts)]
pub struct PublishPaper<'info> {
    #[account(mut)]
    pub faculty_wallet: Signer<'info>,
    #[account(constraint = faculty.authority == faculty_wallet.key() @ ErrorCode::Unauthorized)]
    pub faculty: Account<'info, Researcher>,
    pub global_state: Account<'info, GlobalState>,
    /// CHECK: Researcher receiving the publication cNFT
    pub researcher_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
