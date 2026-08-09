use anchor_lang::prelude::*;
use crate::state::{GlobalState, Researcher, Role};
use crate::instructions::create_reservation::ErrorCode;

pub fn handler(
    ctx: Context<PublishPaper>,
    _title: String,
    _doi: String,
    _cnft_asset_id: [u8; 32],
) -> Result<()> {
    require!(ctx.accounts.faculty.role == Role::Faculty, ErrorCode::Unauthorized);

    // CPI to mpl-bubblegum to mint the cNFT Publication goes here.

    Ok(())
}

#[derive(Accounts)]
pub struct PublishPaper<'info> {
    #[account(mut)]
    pub faculty_wallet: Signer<'info>,

    #[account(
        constraint = faculty.authority == faculty_wallet.key() @ ErrorCode::Unauthorized,
    )]
    pub faculty: Account<'info, Researcher>,

    pub global_state: Account<'info, GlobalState>,

    /// CHECK: The researcher who authored or is receiving the publication
    pub researcher_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
