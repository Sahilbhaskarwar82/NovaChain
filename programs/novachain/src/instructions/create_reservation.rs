use anchor_lang::prelude::*;
use crate::state::{Equipment, EquipmentStatus, Reservation, ReservationStatus, Researcher};

pub fn handler(
    ctx: Context<CreateReservation>,
    reservation_id: String,
    start_time: i64,
    end_time: i64,
) -> Result<()> {
    require!(start_time < end_time, ErrorCode::InvalidTimeRange);

    require!(
        ctx.accounts.equipment.status == EquipmentStatus::Available,
        ErrorCode::EquipmentNotAvailable
    );

    let reservation = &mut ctx.accounts.reservation;
    reservation.equipment_pda = ctx.accounts.equipment.key();
    reservation.researcher_pda = ctx.accounts.researcher.key();
    reservation.start_time = start_time;
    reservation.end_time = end_time;
    reservation.status = ReservationStatus::Pending;

    Ok(())
}

#[derive(Accounts)]
#[instruction(reservation_id: String)]
pub struct CreateReservation<'info> {
    #[account(mut)]
    pub researcher_wallet: Signer<'info>,

    #[account(
        constraint = researcher.authority == researcher_wallet.key() @ ErrorCode::Unauthorized,
    )]
    pub researcher: Account<'info, Researcher>,

    #[account(mut)]
    pub equipment: Account<'info, Equipment>,

    #[account(
        init,
        payer = researcher_wallet,
        space = 8 + 32 + 32 + 8 + 8 + 1,
        seeds = [b"reservation", reservation_id.as_bytes()],
        bump
    )]
    pub reservation: Account<'info, Reservation>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("The equipment is currently not available for reservation.")]
    EquipmentNotAvailable,
    #[msg("Invalid time range specified.")]
    InvalidTimeRange,
}
