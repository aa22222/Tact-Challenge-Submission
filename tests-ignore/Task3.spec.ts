import { Blockchain, SandboxContract, TreasuryContract, } from '@ton-community/sandbox';
import { toNano, Address, beginCell } from 'ton-core';
import { JettonMaster } from 'ton';
import { Task3, TokenNotification } from '../wrappers/Task3';
import { SampleJetton } from '../wrappers/Jetton';
import { JettonDefaultWallet } from '../wrappers/JettonWallet';
import '@ton-community/test-utils';

describe('Task3', () => {
    let blockchain: Blockchain;
    let task3: SandboxContract<Task3>;
    let user: SandboxContract<TreasuryContract>;
    let deployer: SandboxContract<TreasuryContract>;
    let jettonA: SandboxContract<SampleJetton>;
    let jettonB: SandboxContract<SampleJetton>;
    
    async function mintToken(token: SandboxContract<SampleJetton>, user: SandboxContract<TreasuryContract>){
        await token.send(
            user.getSender(),
            { value: toNano("0.05") },
            "Mint: 100"
        );
    }
    
    async function transferToken(token: SandboxContract<SampleJetton>, from: SandboxContract<any>, to: SandboxContract<any>, amount: bigint){
        const walletAddress = await token.getGetWalletAddress(from.address);
        const wallet = blockchain.openContract(JettonDefaultWallet.fromAddress(walletAddress));
        await wallet.send(
            from.getSender(),
            { value: toNano("0.05") },
            {
                $$type: "TokenTransfer",
                queryId: 1n,
                amount: amount,
                destination: to.adddres,
                response_destination: from.address,
                custom_payload: null,
                forward_ton_amount: 0n,
                forward_payload: beginCell().endCell() // Comment Text message when Transfer the jetton
            }
        )
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        user = await blockchain.treasury("user");
        deployer = await blockchain.treasury('deployer');
        
        task3 = blockchain.openContract(await Task3.fromInit(deployer.address, jettonA.address, jettonB.address));
        const deployResult = await task3.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        const jAWallet = await jettonA.getGetWalletAddress(task3.address);

        jettonA = blockchain.openContract(await SampleJetton.fromInit(deployer.address, beginCell().endCell(), 1000000n));
        jettonB = blockchain.openContract(await SampleJetton.fromInit(deployer.address, beginCell().endCell(), 1000000n));
        
        await mintToken(jettonA, user);
        await mintToken(jettonA, deployer);
        await mintToken(jettonB, user);
        await mintToken(jettonB, deployer);
    });

    it('Deposit Coins', async () => {
        await TransferToken(jettonA, deployer);
    });
});


