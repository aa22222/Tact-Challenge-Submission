import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { beginCell, toNano, Address, Cell } from 'ton-core';
import { Task2 } from '../wrappers/Task2';
import '@ton-community/test-utils';

describe('Task2', () => {
    let blockchain: Blockchain;
    let task2: SandboxContract<Task2>;
    let deployer: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer', {balance: 100000000000n});
        task2 = blockchain.openContract(await Task2.fromInit(deployer.address));
        const deployResult = await task2.send(
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
            to: task2.address,
            deploy: true,
            success: true,
        });
    });

    it('Message', async () => {
        const sender = await blockchain.treasury("Sender");
        const message = beginCell().storeStringTail("Hello uwu").endCell();
        const messageResult = await task2.send(
            sender.getSender(),
            {
                value: toNano("0.05")
            },
            message.asSlice(),
        );
        
        // console.log(sender.address, task2.address, deployer.address);
        // console.log(messageResult.transactions.map((e) => [e.inMessage?.info, e.inMessage?.body]));

        expect(messageResult.transactions).toHaveLength(3);
        let adminIn = messageResult.transactions[2].inMessage?.body;
        if(adminIn === undefined) {
            expect(false).toBeTruthy();
            return;
        }
        let inMsg = adminIn; // skip op code
        expect(inMsg).toEqualCell(beginCell().storeAddress(sender.address).storeRef(message).endCell());
    });

    it("Bounce", async () => {
        const sender = await blockchain.treasury("Sender");
        const message = beginCell().storeStringTail("Hello uwu").endCell();
        const messageResult = await task2.send(
            deployer.getSender(),
            {
                value: toNano("5")
            },
            {
                $$type: "Bounced",
                queryId: 34567897675865n,
                sender: sender.address,
            }
        );
        
        // console.log(sender.address, task2.address, deployer.address);
        console.log(messageResult.transactions.map((e) => [e.inMessage?.info, e.inMessage?.body]));

        expect(messageResult.transactions).toHaveLength(3);
        expect(messageResult.transactions).toHaveTransaction({
            from: task2.address,
            to: sender.address,
            success: true
        })
    });

});

