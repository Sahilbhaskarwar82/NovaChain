use anchor_lang::prelude::*;

declare_id!("DBfVgqx6nkAYYGjMQbodBLVgXJa8tDztzZyiragHXxZc");

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
pub enum UserStatus {
    Active,
    Revoked,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EquipmentStatus {
    Available,
    Pending,
    Reserved,
    InUse,
    Decommissioned,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ReservationStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
    Completed,
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
    pub status: UserStatus,
}

#[account]
pub struct Equipment {
    pub name: String,
    pub category: String,
    pub lab: String,
    pub serial_number: String,
    pub department: String,
    pub uri: String,
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

#[account]
pub struct Publication {
    pub author: Pubkey,
    pub faculty: Pubkey,
    pub title: String,
    pub doi: String,
    pub uri: String,
    pub cnft_asset_id: [u8; 32],
    pub published_at: i64,
}

// ─────────────────────────────────────────────
//  Error Codes
// ─────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Your account has been revoked.")]
    AccountRevoked,
    #[msg("The equipment is currently not available.")]
    EquipmentNotAvailable,
    #[msg("Invalid time range: start must be before end.")]
    InvalidTimeRange,
    #[msg("The reservation time has not yet ended.")]
    ReservationNotEnded,
}

// ─────────────────────────────────────────────
//  Program
// ─────────────────────────────────────────────

#[program]
pub mod novachain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, merkle_tree: Pubkey) -> Result<()> {
        let gs = &mut ctx.accounts.global_state;
        gs.admin = ctx.accounts.admin.key();
        gs.merkle_tree = merkle_tree;
        Ok(())
    }

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
        r.status = UserStatus::Active;
        Ok(())
    }

    pub fn revoke_user(ctx: Context<UpdateUserStatus>) -> Result<()> {
        ctx.accounts.researcher.status = UserStatus::Revoked;
        Ok(())
    }

    pub fn reinstate_user(ctx: Context<UpdateUserStatus>) -> Result<()> {
        ctx.accounts.researcher.status = UserStatus::Active;
        Ok(())
    }

    pub fn update_user_role(
        ctx: Context<UpdateUserRole>,
        new_role: Role,
        new_department: String,
    ) -> Result<()> {
        let r = &mut ctx.accounts.researcher;
        r.role = new_role;
        r.department = new_department;
        Ok(())
    }

    pub fn register_equipment(
        ctx: Context<RegisterEquipment>,
        name: String,
        category: String,
        lab: String,
        serial_number: String,
        department: String,
        uri: String,
        cnft_asset_id: [u8; 32],
    ) -> Result<()> {
        let e = &mut ctx.accounts.equipment;
        e.name = name;
        e.category = category;
        e.lab = lab;
        e.serial_number = serial_number;
        e.department = department;
        e.uri = uri;
        e.status = EquipmentStatus::Available;
        e.cnft_asset_id = cnft_asset_id;
        Ok(())
    }

    pub fn decommission_equipment(ctx: Context<DecommissionEquipment>) -> Result<()> {
        ctx.accounts.equipment.status = EquipmentStatus::Decommissioned;
        Ok(())
    }

    pub fn create_reservation(
        ctx: Context<CreateReservation>,
        _reservation_id: String,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        require!(
            ctx.accounts.researcher.status == UserStatus::Active,
            ErrorCode::AccountRevoked
        );
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
        
        // Lock equipment while pending
        ctx.accounts.equipment.status = EquipmentStatus::Pending;

        Ok(())
    }

    pub fn approve_reservation(ctx: Context<ApproveReservation>, approve: bool) -> Result<()> {
        require!(
            ctx.accounts.faculty.role == Role::Faculty && ctx.accounts.faculty.status == UserStatus::Active,
            ErrorCode::Unauthorized
        );
        let res = &mut ctx.accounts.reservation;
        let eq = &mut ctx.accounts.equipment;
        
        if approve {
            res.status = ReservationStatus::Approved;
            eq.status = EquipmentStatus::Reserved;
        } else {
            res.status = ReservationStatus::Rejected;
            eq.status = EquipmentStatus::Available;
        }
        Ok(())
    }

    pub fn cancel_reservation(ctx: Context<CancelReservation>) -> Result<()> {
        require!(
            ctx.accounts.reservation.status == ReservationStatus::Pending || 
            ctx.accounts.reservation.status == ReservationStatus::Approved,
            ErrorCode::Unauthorized
        );
        
        ctx.accounts.reservation.status = ReservationStatus::Cancelled;
        ctx.accounts.equipment.status = EquipmentStatus::Available;
        Ok(())
    }

    pub fn complete_reservation(ctx: Context<CompleteReservation>) -> Result<()> {
        require!(
            ctx.accounts.reservation.status == ReservationStatus::Approved,
            ErrorCode::Unauthorized
        );
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp > ctx.accounts.reservation.end_time,
            ErrorCode::ReservationNotEnded
        );

        ctx.accounts.reservation.status = ReservationStatus::Completed;
        ctx.accounts.equipment.status = EquipmentStatus::Available;
        Ok(())
    }

    pub fn publish_paper(
        ctx: Context<PublishPaper>,
        title: String,
        doi: String,
        doi_hash: [u8; 32],
        uri: String,
        cnft_asset_id: [u8; 32],
    ) -> Result<()> {
        require!(
            ctx.accounts.faculty.role == Role::Faculty && ctx.accounts.faculty.status == UserStatus::Active,
            ErrorCode::Unauthorized
        );

        let pub_acct = &mut ctx.accounts.publication;
        pub_acct.author = ctx.accounts.researcher_wallet.key();
        pub_acct.faculty = ctx.accounts.faculty_wallet.key();
        pub_acct.title = title;
        pub_acct.doi = doi;
        pub_acct.uri = uri;
        pub_acct.cnft_asset_id = cnft_asset_id;
        pub_acct.published_at = Clock::get()?.unix_timestamp;

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
        space = 8 + 32 + 1 + 4 + 100 + 4 + 100 + 32 + 1,
        seeds = [b"researcher", user_wallet.key().as_ref()],
        bump
    )]
    pub researcher: Account<'info, Researcher>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateUserStatus<'info> {
    #[account(has_one = admin)]
    pub global_state: Account<'info, GlobalState>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub researcher: Account<'info, Researcher>,
}

#[derive(Accounts)]
pub struct UpdateUserRole<'info> {
    #[account(has_one = admin)]
    pub global_state: Account<'info, GlobalState>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub researcher: Account<'info, Researcher>,
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
        space = 8 + 4 + 100 + 4 + 100 + 4 + 100 + 4 + 100 + 4 + 100 + 4 + 200 + 1 + 32,
        seeds = [b"equipment", name.as_bytes()],
        bump
    )]
    pub equipment: Account<'info, Equipment>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DecommissionEquipment<'info> {
    #[account(has_one = admin)]
    pub global_state: Account<'info, GlobalState>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub equipment: Account<'info, Equipment>,
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
pub struct CancelReservation<'info> {
    pub researcher_wallet: Signer<'info>,
    #[account(constraint = researcher.authority == researcher_wallet.key() @ ErrorCode::Unauthorized)]
    pub researcher: Account<'info, Researcher>,
    #[account(
        mut,
        constraint = reservation.researcher_pda == researcher.key() @ ErrorCode::Unauthorized
    )]
    pub reservation: Account<'info, Reservation>,
    #[account(
        mut,
        constraint = reservation.equipment_pda == equipment.key() @ ErrorCode::Unauthorized
    )]
    pub equipment: Account<'info, Equipment>,
}

#[derive(Accounts)]
pub struct CompleteReservation<'info> {
    // Anyone can crank this instruction if the blocktime is valid
    #[account(mut)]
    pub reservation: Account<'info, Reservation>,
    #[account(
        mut,
        constraint = reservation.equipment_pda == equipment.key() @ ErrorCode::Unauthorized
    )]
    pub equipment: Account<'info, Equipment>,
}

#[derive(Accounts)]
#[instruction(title: String, doi: String, doi_hash: [u8; 32])]
pub struct PublishPaper<'info> {
    #[account(mut)]
    pub faculty_wallet: Signer<'info>,
    #[account(constraint = faculty.authority == faculty_wallet.key() @ ErrorCode::Unauthorized)]
    pub faculty: Account<'info, Researcher>,
    pub global_state: Account<'info, GlobalState>,
    /// CHECK: Researcher receiving the publication cNFT
    pub researcher_wallet: UncheckedAccount<'info>,
    #[account(
        init,
        payer = faculty_wallet,
        space = 8 + 32 + 32 + 4 + 200 + 4 + 100 + 4 + 200 + 32 + 8,
        seeds = [b"publication", researcher_wallet.key().as_ref(), doi_hash.as_ref()],
        bump
    )]
    pub publication: Account<'info, Publication>,
    pub system_program: Program<'info, System>,
}
