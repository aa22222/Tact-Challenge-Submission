import { Blockchain, SandboxContract, TreasuryContract, } from '@ton-community/sandbox';
import { toNano, Address, beginCell } from 'ton-core';
import { JettonMaster } from 'ton';
import { Task3, TokenNotification } from '../wrappers/Task3';
import { SampleJetton } from '../wrappers/Jetton';
import { JettonDefaultWallet } from '../wrappers/JettonWallet';
import '@ton-community/test-utils';

async function transfer(jetton: SandboxContract<TreasuryContract>, from: SandboxContract<any>, to: SandboxContract<Task3>, amount: bigint){
    return await to.send(
        jetton.getSender(),
        { value: toNano("0.05") },
        {
            $$type: "TokenNotification",
            queryId: BigInt(1) << 64n - 1n,
            amount: amount,
            from: from.address,
            forwardPayload: beginCell().endCell()
        }
    )
}

describe('Task3', () => {
    let blockchain: Blockchain;
    let task3: SandboxContract<Task3>;
    let user: SandboxContract<TreasuryContract>;
    let deployer: SandboxContract<TreasuryContract>;
    let jettonA: SandboxContract<TreasuryContract>;
    let jettonB: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        user = await blockchain.treasury("user");
        deployer = await blockchain.treasury('deployer', { balance: toNano('100')});
        jettonA = await blockchain.treasury('a');
        jettonB = await blockchain.treasury('b');
        task3 = blockchain.openContract(await Task3.fromInit(deployer.address, jettonA.address, jettonB.address));

        const deployResult = await task3.send(
            deployer.getSender(),
            {
                value: toNano('5'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
    });

    it('Deposit Coins', async () => {
        await transfer(jettonA, deployer, task3, 100n);
        await transfer(jettonB, deployer, task3, 150n);

        expect(await task3.getBalance(jettonA.address)).toEqual(100n);
        expect(await task3.getBalance(jettonB.address)).toEqual(150n);

        await transfer(jettonA, user, task3, 50n);

        expect(await task3.getBalance(jettonA.address)).toEqual(150n);
        expect(await task3.getBalance(jettonB.address)).toEqual(75n);

        let res = await transfer(jettonB, user, task3, 25n);
        let resC = res.transactions[2].inMessage?.body.beginParse();
        if(resC == null) return;
        resC.skip(32 + 64);
        expect(res.transactions[2].inMessage?.info.dest).toEqualAddress(jettonA.address);
        expect(resC.loadCoins()).toEqual(50n);
        expect(resC.loadAddress()).toEqualAddress(user.address);
        expect(resC.loadAddress()).toEqualAddress(user.address);
        expect(resC.loadCoins()).toEqual(0n);
        
        expect(await task3.getBalance(jettonA.address)).toEqual(100n);
        expect(await task3.getBalance(jettonB.address)).toEqual(100n);
        

        res = await transfer(jettonB, user, task3, 200n);
        resC = res.transactions[2].inMessage?.body.beginParse();
        if(resC == null) return;
        resC.skip(32 + 64);
        expect(res.transactions[2].inMessage?.info.dest).toEqualAddress(jettonB.address);
        expect(resC.loadCoins()).toEqual(200n);
        expect(resC.loadAddress()).toEqualAddress(user.address);
        expect(resC.loadAddress()).toEqualAddress(user.address);
        expect(resC.loadCoins()).toEqual(0n);
        
        expect(await task3.getBalance(jettonA.address)).toEqual(100n);
        expect(await task3.getBalance(jettonB.address)).toEqual(100n);
    });
});


