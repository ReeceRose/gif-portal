const anchor = require("@project-serum/anchor");

const { SystemProgram } = anchor.web3;

describe("solana", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.Provider.env();
  anchor.setProvider(provider);

  const initializeBaseAccount = async (program, baseAccount) => {
    return await program.rpc.initialize({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount],
    });
  };

  it("Gets initialized account", async () => {
    const program = anchor.workspace.Solana;
    const baseAccount = anchor.web3.Keypair.generate();

    const tx = await initializeBaseAccount(program, baseAccount);

    console.log("Your transaction signature", tx);

    let account = await program.account.baseAccount.fetch(
      baseAccount.publicKey
    );
    console.log("GIF Count", account.totalGifs.toString());
    // Assert gifCount to be 0
  });

  it("Inserts expected GIF", async () => {
    const program = anchor.workspace.Solana;
    const baseAccount = anchor.web3.Keypair.generate();

    const tx = await initializeBaseAccount(program, baseAccount);

    console.log("Your transaction signature", tx);

    let account = await program.account.baseAccount.fetch(
      baseAccount.publicKey
    );
    // assert 0
    console.log("GIF Count", account.totalGifs.toString());
    await program.rpc.addGif("gif_link", {
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      },
    });
    account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    // assert 1
    console.log("GIF Count", account.totalGifs.toString());
    console.log("GIF Link", account.gifList[0].gifLink);
    // assert gif_link is = gif_link
  });
});
