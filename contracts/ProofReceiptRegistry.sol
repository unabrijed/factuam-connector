// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProofReceiptRegistry {
    struct Receipt {
        address creator;
        bytes32 receiptHash;
        bytes32 datasetHash;
        bytes32 modelHash;
        bytes32 backtestHash;
        string receiptUri;
        uint256 createdAt;
    }

    mapping(bytes32 => Receipt) public receipts;

    event ReceiptRegistered(
        address indexed creator,
        bytes32 indexed receiptHash,
        bytes32 datasetHash,
        bytes32 modelHash,
        bytes32 backtestHash,
        string receiptUri,
        uint256 createdAt
    );

    function registerReceipt(
        bytes32 receiptHash,
        bytes32 datasetHash,
        bytes32 modelHash,
        bytes32 backtestHash,
        string calldata receiptUri
    ) external {
        require(receipts[receiptHash].createdAt == 0, "Receipt already exists");

        receipts[receiptHash] = Receipt({
            creator: msg.sender,
            receiptHash: receiptHash,
            datasetHash: datasetHash,
            modelHash: modelHash,
            backtestHash: backtestHash,
            receiptUri: receiptUri,
            createdAt: block.timestamp
        });

        emit ReceiptRegistered(
            msg.sender,
            receiptHash,
            datasetHash,
            modelHash,
            backtestHash,
            receiptUri,
            block.timestamp
        );
    }
}
