use anchor_lang::prelude::*;

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
    pub merkle_tree: Pubkey, // Main tree for cNFTs
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
    pub cnft_asset_id: [u8; 32], // Hash of the asset
}

#[account]
pub struct Reservation {
    pub equipment_pda: Pubkey,
    pub researcher_pda: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub status: ReservationStatus,
}
