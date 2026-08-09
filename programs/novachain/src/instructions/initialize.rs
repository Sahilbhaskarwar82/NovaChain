use anchor_lang::prelude::*;
use crate::state::GlobalState;

pub fn handler(ctx: Context<Initialize>, merkle_tree: Pubkey) -> Result<()> {
    let global_state = &mut ctx.accounts.global_state;
    global_state.admin = ctx.accounts.admin.key();
    global_state.merkle_tree = merkle_tree;
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32, // Discriminator + Admin Pubkey + Merkle Tree Pubkey
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}
