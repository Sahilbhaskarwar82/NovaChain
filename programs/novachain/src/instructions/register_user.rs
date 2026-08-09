use anchor_lang::prelude::*;
use crate::state::{GlobalState, Researcher, Role};

pub fn handler(
    ctx: Context<RegisterUser>,
    role: Role,
    department: String,
    name: String,
    sbt_mint: Pubkey,
) -> Result<()> {
    let researcher = &mut ctx.accounts.researcher;
    researcher.authority = ctx.accounts.user_wallet.key();
    researcher.role = role;
    researcher.department = department;
    researcher.name = name;
    researcher.sbt_mint = sbt_mint;
    
    // Logic for CPI to Token-2022 to mint the NonTransferable token would go here.
    // Given the complexity of Token-2022 extensions via CPI, we assume the mint
    // is instantiated and we store its pubkey, representing the Soulbound token.

    Ok(())
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        mut,
        has_one = admin,
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: The wallet address of the user being registered
    pub user_wallet: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1 + 64 + 64 + 32, // Discriminator + pubkey + enum + string + string + pubkey
        seeds = [b"researcher", user_wallet.key().as_ref()],
        bump
    )]
    pub researcher: Account<'info, Researcher>,

    pub system_program: Program<'info, System>,
}
