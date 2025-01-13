function stripPadding(logTopic) {
    return logTopic ? '0x' + logTopic.slice(-40).toLowerCase() : '';
}

function parseSingleData(data) {
    if (!data || data === '0x') return { tokenId: 0, value: 0 };
    const idHex = data.slice(2, 66).replace(/^0+/, '') || '0';
    const valueHex = data.slice(66).replace(/^0+/, '') || '0';
    const id = idHex === '0' ? 0 : BigInt('0x' + idHex);
    const value = valueHex === '0' ? 0 : BigInt('0x' + valueHex);
    return { tokenId: id, value: value };
}

function parseBatchData(data) {
    if (!data || data.length < 130) return { ids: [], values: [] };
    const idsArrayOffset = parseInt(data.slice(2, 66), 16) * 2 + 2;
    const valuesArrayOffset = parseInt(data.slice(66, 130), 16) * 2 + 2;
    const tokenCount = (valuesArrayOffset - idsArrayOffset) / 64;

    const ids = Array.from({ length: tokenCount }, (_, i) => {
        const idHex = data.slice(idsArrayOffset + i * 64, idsArrayOffset + (i + 1) * 64).replace(/^0+/, '') || '0';
        return idHex === '0' ? 0 : BigInt('0x' + idHex);
    });

    const values = Array.from({ length: tokenCount }, (_, i) => {
        const valueHex = data.slice(valuesArrayOffset + i * 64, valuesArrayOffset + (i + 1) * 64).replace(/^0+/, '') || '0';
        return valueHex === '0' ? 0 : BigInt('0x' + valueHex);
    });

    return { ids, values };
}

function main(stream) {
    // If stream is configured with metadata in the body, the data may be nested under a `data` key
    const data = stream.data ? stream.data : stream;

    try {
        const erc20Transfers = [];
        const erc721Transfers = [];
        const erc1155Transfers = [];

        data.forEach(stream => {
            if (!stream || !stream.block || !stream.receipts) {
                return;
            }


            results.qnGetList = qnGetList('handle-finder')

            console.log('erc20Transfers:', erc20Transfers);
            
            const blockTimestamp = stream.block.timestamp ? parseInt(stream.block.timestamp, 16) * 1000 : Date.now();

            stream.receipts.forEach(receipt => {
                if (!receipt || !receipt.logs) return;

                receipt.logs.forEach(log => {
                    if (!log || !log.topics || log.topics.length === 0) return;

                    if (log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
                        if (log.topics.length === 3 && log.data && log.data !== '0x') {
                            const valueHex = log.data.slice(2).replace(/^0+/, '');
                            const value = valueHex ? BigInt('0x' + valueHex).toString() : '0';
                            erc20Transfers.push({
                                type: 'ERC20',
                                sender: stripPadding(log.topics[1]),
                                receiver: stripPadding(log.topics[2]),
                                value: value,
                                contract: log.address,
                                txHash: log.transactionHash,
                                txIndex: log.transactionIndex,
                                blockTimestamp: blockTimestamp
                            });
                        } else if (log.topics.length === 4 && (!log.data || log.data === '0x')) {
                            const tokenId = BigInt(log.topics[3]).toString();
                            erc721Transfers.push({
                                type: 'ERC721',
                                sender: stripPadding(log.topics[1]),
                                receiver: stripPadding(log.topics[2]),
                                tokenId: tokenId,
                                contract: log.address,
                                txHash: log.transactionHash,
                                txIndex: log.transactionIndex,
                                blockTimestamp: blockTimestamp
                            });
                        }
                    } else if (log.topics[0] === '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62') {
                        const { tokenId, value } = parseSingleData(log.data);
                        erc1155Transfers.push({
                            type: 'ERC1155_Single',
                            operator: stripPadding(log.topics[1]),
                            sender: stripPadding(log.topics[2]),
                            receiver: stripPadding(log.topics[3]),
                            tokenId: tokenId.toString(),
                            value: value.toString(),
                            contract: log.address,
                            txHash: log.transactionHash,
                            txIndex: log.transactionIndex,
                            blockTimestamp: blockTimestamp
                        });
                    } else if (log.topics[0] === '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb') {
                        const { ids, values } = parseBatchData(log.data);
                        ids.forEach((id, index) => {
                            erc1155Transfers.push({
                                type: 'ERC1155_Batch',
                                operator: stripPadding(log.topics[1]),
                                from: stripPadding(log.topics[2]),
                                to: stripPadding(log.topics[3]),
                                tokenId: id.toString(),
                                value: values[index].toString(),
                                contract: log.address,
                                txHash: log.transactionHash,
                                txIndex: log.transactionIndex,
                                blockTimestamp: blockTimestamp
                            });
                        });
                    }
                });
            });
        });

        console.log('ERC20 Transfers:', erc20Transfers);
        console.log('ERC721 Transfers:', erc721Transfers);
        console.log('ERC1155 Transfers:', erc1155Transfers);

        if (!erc20Transfers.length && !erc721Transfers.length && !erc1155Transfers.length) {
            return null;
        }

        return { 
            erc20: erc20Transfers, 
            erc721: erc721Transfers, 
            erc1155: erc1155Transfers
        };
    } catch (e) {
        console.error('Error in main function:', e);
        return { error: e.message };
    }
}
