# NovaChain

**Decentralized Research Infrastructure on Solana**

NovaChain is an open-source dApp that gives academic institutions a trustless, on-chain system for managing lab equipment reservations, soulbound researcher identities, and verifiable research publications via compressed NFTs (cNFTs).

Each institution deploys its **own independent instance** of the program — with its own Program ID, admin wallet, users, and data. Institutions never share state.

---

## Features

- **Soulbound Identity (SBT):** Faculty and Researchers register with non-transferable on-chain identities tied to their wallet. The Admin approves or revokes accounts.
- **Lab Equipment Reservations:** Researchers browse available equipment, request bookings, and Faculty approve or reject them. Live countdowns track session expiry and auto-complete reservations when time runs out.
- **On-Chain Research Publications:** Faculty publish research papers by registering metadata (title, DOI, IPFS PDF URI) as a PDA on Solana, cryptographically linked to the researcher's wallet.
- **Compressed NFT Minting:** Every publication mints a Metaplex Bubblegum cNFT to the researcher's wallet as a portable, verifiable proof of work.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Anchor (Rust) |
| Frontend | Next.js 16, Tailwind CSS |
| File Storage | IPFS via Pinata |
| NFT Standard | Metaplex Bubblegum (cNFTs) |
| RPC Provider | Helius |
| Deployment | Vercel |

---

## Prerequisites

Before setting up NovaChain, install the following tools.

### 1. Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update
```

### 2. Solana CLI

```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

Verify:

```bash
solana --version
```

### 3. Anchor CLI

```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest
avm use latest
```

Verify:

```bash
anchor --version
```

### 4. Node.js and npm

Download from [nodejs.org](https://nodejs.org/) (LTS v18+ recommended).

### 5. Yarn (optional, required for Anchor tests)

```bash
npm install -g yarn
```

---

## Setting Up for a New Institution

Each institution deploys their own fully isolated instance of NovaChain. Follow these steps in order.

---

### Step 1 — Clone the Repository

```bash
git clone https://github.com/<your-org>/novachain.git
cd novachain
```

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd web && npm install && cd ..
```

---

### Step 2 — Generate the Admin Keypair

The admin wallet is the wallet that will call `initialize()` and become the permanent on-chain admin of your institution's instance.

```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

> **Important:** Back up this keypair securely. Whoever holds this key controls your institution's NovaChain instance.

Set it as the default CLI wallet:

```bash
solana config set --keypair ~/.config/solana/id.json
```

Set the network to Devnet (or Mainnet when ready):

```bash
solana config set --url devnet
```

Airdrop SOL for transaction fees:

```bash
solana airdrop 2
```

---

### Step 3 — Get a Helius RPC URL

1. Sign up at [helius.dev](https://helius.dev/)
2. Create a new API key
3. Copy the Devnet RPC URL: `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`

Update `Anchor.toml`:

```toml
[provider]
cluster = "https://devnet.helius-rpc.com/?api-key=YOUR_KEY"
wallet = "~/.config/solana/id.json"
```

---

### Step 4 — Generate a New Program ID

Since each institution needs a unique Program ID, run:

```bash
anchor keys sync
```

This generates a new keypair for the program under `target/deploy/novachain-keypair.json` and automatically updates `declare_id!` in `programs/novachain/src/lib.rs` and `Anchor.toml`.

---

### Step 5 — Build and Deploy the Program

```bash
anchor build
anchor deploy
```

After a successful deploy, note the **Program ID** printed in the output. This is unique to your institution's instance.

---

### Step 6 — Initialize the Program

The `initialize()` instruction sets up the on-chain global state and permanently assigns the caller as the admin. Run the init script:

```bash
npx ts-node scripts/initDevnet.ts
```

> **This must only be run once.** Whoever's wallet signs this transaction becomes `gs.admin` permanently on your instance. There is no way to change admin after this.

---

### Step 7 — Set Up Pinata (IPFS)

1. Sign up at [pinata.cloud](https://pinata.cloud/)
2. Go to **API Keys** and create a new key with `pinFileToIPFS` permission
3. Copy the JWT token

---

### Step 8 — Configure the Frontend

Create `web/.env.local`:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID_FROM_STEP_5
NEXT_PUBLIC_PINATA_JWT=YOUR_PINATA_JWT
NEXT_PUBLIC_PINATA_GATEWAY=https://gateway.pinata.cloud
```

> **Never commit `.env.local` to Git.** It is already listed in `.gitignore`.

---

### Step 9 — Run the Frontend Locally

```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Step 10 — Deploy the Frontend (Vercel)

1. Push your repository to GitHub
2. Go to [vercel.com](https://vercel.com/) and import the repository
3. Set the **Root Directory** to `web`
4. Add all 5 environment variables from your `.env.local` under **Environment Variables**
5. Set the **Environments** dropdown to `Production and Preview`
6. Click **Deploy**

---

### Step 11 — Register Users via the Admin Dashboard

Once deployed, connect your admin wallet and navigate to `/admin`. From there:

1. **Register Faculty** — Enter their Solana wallet address and select the Faculty role
2. **Register Researchers** — Enter their wallet address and select the Researcher role
3. **Register Equipment** — Add lab instruments with name, category, lab, and an image uploaded to Pinata

All registrations are on-chain transactions signed by the admin wallet.

---

## Project Structure

```
novachain/
├── programs/
│   └── novachain/
│       └── src/
│           └── lib.rs              # Anchor smart contract
├── scripts/
│   └── initDevnet.ts               # One-time initialization script
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── admin/              # Admin dashboard
│   │   │   ├── faculty/            # Faculty dashboard
│   │   │   └── researcher/         # Researcher dashboard
│   │   ├── components/
│   │   │   ├── layout/Navbar.tsx
│   │   │   └── providers/ClientProviders.tsx
│   │   ├── idl/
│   │   │   └── novachain.json      # Auto-generated Anchor IDL
│   │   └── lib/
│   │       └── solana/
│   │           ├── anchor.ts       # Program helpers and PDA derivations
│   │           ├── pinata.ts       # IPFS upload helpers
│   │           └── umi.ts          # Metaplex UMI helpers
│   └── .env.local                  # Your secrets (never commit this)
├── Anchor.toml
├── Cargo.toml
└── README.md
```

---

## Multi-Institution Isolation

Each institution that deploys NovaChain gets:

| Resource | Isolation |
|---|---|
| Program ID | Unique per institution (generated by `anchor keys sync`) |
| Admin wallet | Unique keypair, set permanently on first `initialize()` |
| On-chain data | Completely isolated — PDAs are scoped to that Program ID |
| Frontend | Separate Vercel project with its own domain and environment |
| Pinata account | Separate IPFS storage bucket |
| Helius key | Separate RPC quota |

No shared state, no shared authority. Institutions operate fully independently.

---

## License

MIT — free to fork, deploy, and adapt for your institution.
