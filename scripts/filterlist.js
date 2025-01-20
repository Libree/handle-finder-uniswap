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
    const data = stream.data ? stream.data : stream;

    const filterFrom = ['0x0000000000000000000000000000000000000000'];
    const filterTo = ['0x000000000000000000000000000000000000dead'];

    try {
        const erc20Transfers = [];
        const setAddresses = new Set([
            ...qnGetList('handle-finder-lens'),
            ...qnGetList('handle-finder-farcaster'),
        ]);

        data.forEach(stream => {
            if (!stream || !stream.block || !stream.receipts) {
                return;
            }

            const blockTimestamp = stream.block.timestamp ? parseInt(stream.block.timestamp, 16) * 1000 : Date.now();

            stream.receipts.forEach(receipt => {
                if (!receipt || !receipt.logs) return;

                receipt.logs.forEach(log => {
                    if (!log || !log.topics || log.topics.length === 0) return;

                    if (!setAddresses.has(stripPadding(log.topics[2]))) return;

                    if (filterFrom.includes(stripPadding(log.topics[1])) || filterTo.includes(stripPadding(log.topics[2]))) {
                        return;
                    }

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
                        }
                    }
                });
            });
        });

        if (!erc20Transfers.length) {
            return null;
        }

        return {
            erc20: erc20Transfers
        };
    } catch (e) {
        console.error('Error in main function:', e);
        return { error: e.message };
    }
}
