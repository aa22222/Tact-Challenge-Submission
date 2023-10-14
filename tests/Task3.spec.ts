import { Blockchain, SandboxContract, TreasuryContract, } from '@ton-community/sandbox';
import { toNano, Address, beginCell } from 'ton-core';
import { JettonMaster } from 'ton';
import { Task3, TokenNotification } from '../wrappers/Task3';
import '@ton-community/test-utils';

function tokenNotification(amount: bigint, from: Address) : TokenNotification {
    return {
        $$type: 'TokenNotification',
        queryId: 1n,
        amount: amount,
        from: from,
        forwardPayload: beginCell().endCell()
    };
}
describe('Task3', () => {
    let blockchain: Blockchain;
    let task3: SandboxContract<Task3>;
    let user: SandboxContract<TreasuryContract>;
    let jettonA: SandboxContract<TreasuryContract>;
    let jettonB: SandboxContract<TreasuryContract>;
    let deployer: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        
        user = await blockchain.treasury("user");
        jettonA = await blockchain.treasury("jettonA");
        jettonB = await blockchain.treasury("jettonB");
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
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task3.address,
            deploy: true,
            success: true,
        });
    });

    it('Deposit Coins', async () => {
        const aRes = await task3.send(
            jettonA.getSender(),
            {
                value: toNano('0.05')
            },
            tokenNotification(10000n, deployer.address)
        );
        const bRes = await task3.send(
            jettonB.getSender(),
            {
                value: toNano('0.05')
            },
            tokenNotification(5000n, deployer.address)
        );
        console.log([
            await task3.getBalance(jettonA.address),
            await task3.getBalance(jettonB.address),
        ]);

        
        const swapAforB = await task3.send(
            jettonA.getSender(),
            {
                value: toNano('0.05')
            },
            tokenNotification(10n, user.address)
        );

        console.log([
            await task3.getBalance(jettonA.address),
            await task3.getBalance(jettonB.address),
        ]);

    });
});


