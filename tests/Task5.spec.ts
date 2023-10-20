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
    let nftCollection: SandboxContract<TreasuryContract>;
    let deployer: SandboxContract<TreasuryContract>;

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
        const re = await transferNft(nft, nftCollection, owner, toNano(".1"));
        
        return nft;
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer', {balance : toNano("1000.00")});
        nftCollection = await blockchain.treasury('nftCollection', {balance : toNano("1000.00")});
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
        const nfts = [];
        for(let i = 0 ; i< 150; i++){
            let nft = await createNft(BigInt(i), deployer);
            expect((await nft.getGetNftData()).owner_address).toEqualAddress(deployer.address);
            const r = await transferNft(nft, deployer, task5, toNano(".1"));
            nfts.push(nft);
        }
        
        for(const nft of nfts){
            expect((await nft.getGetNftData()).owner_address).toEqualAddress(task5.address);
        }

        console.log(await task5.getNfts());
        const res = await task5.send(
            deployer.getSender(),
            { value: toNano("500")},
            {
                $$type: "AdminWithdrawalAllNFTs",
                queryId: 10n
            }    
        )

        for(const nft of nfts){
            expect((await nft.getGetNftData()).owner_address).toEqualAddress(deployer.address);
        }

        // for(let i = 0; i < 1; i++){
        //     let nft = await createNft(BigInt(i + 20), user);
        //     expect((await nft.getGetNftData()).owner_address).toEqualAddress(user.address);
        //     const r = await transferNft(nft, user, task5, toNano(".2"));
        //     console.log(r.transactions.map(e=>e.inMessage?.info));
        //     console.log(r.transactions.map(e=>e.inMessage?.body));
        // }
        // console.log(await task5.getNfts());
    });
});



