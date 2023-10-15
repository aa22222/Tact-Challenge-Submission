import { Blockchain, SandboxContract, SendMessageResult, TreasuryContract } from '@ton-community/sandbox';
import { Address, beginCell, toNano } from 'ton-core';
import { Task5 } from '../wrappers/Task5';
import { NftItem } from '../wrappers/Nft';
import { NftCollection } from '../wrappers/NftCollection';
import { tonDeepLink } from '@ton-community/blueprint';
import "@ton-community/test-utils";

describe('Task5', () => {
    let blockchain: Blockchain;
    let task5: SandboxContract<Task5>;
    let nftCollection: SandboxContract<any>;
    let deployer: SandboxContract<TreasuryContract>

    async function transferNft(nft: SandboxContract<NftItem>, from: SandboxContract<TreasuryContract>, to: SandboxContract<any>, value: bigint ) : Promise<SendMessageResult> {
        return await nft.send(
            from.getSender(),
            { value: toNano("3") },
            {
                $$type: "Transfer",
                query_id: 1n,
                new_owner: to.address,
                response_destination: from.address,
                custom_payload: null,
                forward_amount: value,
                forward_payload: beginCell().endCell()
            }
        )
    }

    async function createNft(index: bigint, owner: SandboxContract<any>){
        const nft = blockchain.openContract(
            await NftItem.fromInit(nftCollection.address, index, nftCollection.address, beginCell().endCell()));
        await transferNft(nft, nftCollection, owner, 0n);
        return nft;
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer', {balance : toNano("100.00")});
        nftCollection = await blockchain.treasury('nftCollection', {balance : toNano("100.00")});
        task5 = blockchain.openContract(await Task5.fromInit(123n, deployer.address));
        const deployResult = await task5.send(
            deployer.getSender(),
            { value: toNano('1') },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task5.address,
            deploy: true,
            success: true,
        });
    });

    it('Dont sent enough TON', async () => {
        const user = await blockchain.treasury("user", {balance : toNano("100.00")});
        const nftU = await createNft(0n, user);
        const nftA = await createNft(1n, deployer);
        expect((await nftA.getGetNftData()).owner_address).toEqualAddress(deployer.address);
        expect((await nftU.getGetNftData()).owner_address).toEqualAddress(user.address);

        const res = await transferNft(nftA, deployer, task5, toNano("0.05"));
        // console.log(res.transactions.map(e => e.inMessage?.info));
        // console.log(res.transactions.map(e => e.description));
        expect((await nftA.getGetNftData()).owner_address).toEqualAddress(task5.address);

        const res2 = await transferNft(nftU, user, task5, toNano("1.1"));
        // console.log(await user.getBalance())
        // console.log(res2.transactions.map(e => e.inMessage?.info));
        // console.log(res2.transactions.map(e => e.debugLogs));
        // console.log(res2.transactions.map(e => e.description));
        // expect((await nftA.getGetNftData()).owner_address).toEqualAddress(user.address);
        console.log(res2.transactions.map(e => [e.inMessage?.info, e.inMessage?.body]))
        console.log([user, deployer, nftA, nftU, task5].map(e => e.address).join('\n'))
    });
});



