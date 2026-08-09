use anchor_lang::prelude::*;
use crate::state::{GlobalState, Equipment, EquipmentStatus};

pub fn handler(
    ctx: Context<RegisterEquipment>,
    name: String,
    category: String,
    lab: String,
    cnft_asset_id: [u8; 32],
) -> Result<()> {
    let equipment = &mut ctx.accounts.equipment;
    equipment.name = name;
    equipment.category = category;
    equipment.lab = lab;
    equipment.status = EquipmentStatus::Available;
    equipment.cnft_asset_id = cnft_asset_id;

    // Logic for CPI to mpl-bubblegum to mint the cNFT goes here.
    // We assume the cNFT is minted successfully to the Merkle tree.

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterEquipment<'info> {
    #[account(
        mut,
        has_one = admin,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 64 + 64 + 64 + 1 + 32,
        seeds = [b"equipment", name.as_bytes()],
        bump
    )]
    pub equipment: Account<'info, Equipment>,

    pub system_program: Program<'info, System>,
}
