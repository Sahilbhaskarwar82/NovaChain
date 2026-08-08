use anchor_lang::prelude::*;

declare_id!("NovaChain111111111111111111111111111111111");

pub mod instructions;
pub mod state;

use instructions::*;

#[program]
pub mod novachain {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
