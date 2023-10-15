import { Blockchain, SandboxContract, SendMessageResult, TreasuryContract } from '@ton-community/sandbox';
import { Address, beginCell, toNano } from 'ton-core';
import { Task4 } from '../wrappers/Task4';
import { NftItem } from '../wrappers/Nft';
import { NftCollection } from '../wrappers/NftCollection';
import "@ton-community/test-utils";

describe('Task4', () => {
    let blockchain: Blockchain;
    let task4: SandboxContract<Task4>;
    let nftCollection: SandboxContract<any>;
    async function transferNft(nft: SandboxContract<NftItem>, from: SandboxContract<TreasuryContract>, to: SandboxContract<any>, time: number ) : Promise<SendMessageResult> {
        return await nft.send(
            from.getSender(),
            { value: toNano(".5") },
            {
                $$type: "Transfer",
                query_id: 1n,
                new_owner: to.address,
                response_destination: from.address,
                custom_payload: null,
                forward_amount: toNano("0.1"),
                forward_payload: beginCell().storeUint(time, 32).endCell()
            }
        )
    }

    async function createNft(index: bigint, owner: SandboxContract<any>){
        const nft = blockchain.openContract(
            await NftItem.fromInit(nftCollection.address, index, nftCollection.address, beginCell().endCell()));
        await transferNft(nft, nftCollection, owner, 0);
        return nft;
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        task4 = blockchain.openContract(await Task4.fromInit(1n));
        const deployer = await blockchain.treasury('deployer', {balance : toNano("100")});
        nftCollection = await blockchain.treasury('nftCollection', {balance : toNano("100.00")});
        const deployResult = await task4.send(
            deployer.getSender(),
            {
                value: toNano('0.5'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: task4.address,
            deploy: true,
            success: true,
        });
    });

    it('test', async () => {
        const user = await blockchain.treasury("user", {balance : toNano("100.00")});
        const user2 = await blockchain.treasury("user2", {balance : toNano("100.00")});
        const nft0 = await createNft(0n, user);
        const nft1 = await createNft(1n, user2)

        const res = await transferNft(nft0, user, task4, 10000);
        // console.log(res.transactions.map(e => [e.inMessage?.info, e.description]));

        const res2 = await transferNft(nft1, user2, task4, 0);
        console.log(res2.transactions.map(e => [e.inMessage?.info, e.inMessage?.body]));

        const log = [await task4.getNft(), await task4.getOwner(), await task4.getTime()]
        console.log(log)
        
    });
});


