use anchor_lang::prelude::*;
use crate::state::{Equipment, EquipmentStatus, Reservation, ReservationStatus, Researcher, Role};
use crate::instructions::create_reservation::ErrorCode;

pub fn handler(ctx: Context<ApproveReservation>, approve: bool) -> Result<()> {
    require!(ctx.accounts.faculty.role == Role::Faculty, ErrorCode::Unauthorized);

    let reservation = &mut ctx.accounts.reservation;
    let equipment = &mut ctx.accounts.equipment;

    if approve {
        reservation.status = ReservationStatus::Approved;
        equipment.status = EquipmentStatus::Reserved;
    } else {
        reservation.status = ReservationStatus::Rejected;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct ApproveReservation<'info> {
    #[account(mut)]
    pub faculty_wallet: Signer<'info>,

    #[account(
        constraint = faculty.authority == faculty_wallet.key() @ ErrorCode::Unauthorized,
    )]
    pub faculty: Account<'info, Researcher>,

    #[account(
        mut,
        constraint = reservation.equipment_pda == equipment.key() @ ErrorCode::Unauthorized,
    )]
    pub reservation: Account<'info, Reservation>,

    #[account(mut)]
    pub equipment: Account<'info, Equipment>,
}
