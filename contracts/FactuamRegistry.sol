// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * FactuamRegistry — anchor dual-receipt hashes on Gensyn Chain.
 * Network parameters: docs.gensyn.network/network-information
 * (Mainnet chain ID 685689, Testnet 685685)
 */
contract FactuamRegistry {
    event ExperimentAnchored(
        bytes32 indexed experimentId,
        bytes32 agentReceiptHash,
        bytes32 modelReceiptHash,
        bytes32 reeReceiptHash,
        uint256 timestamp
    );

    struct AnchorRecord {
        bytes32 agentReceiptHash;
        bytes32 modelReceiptHash;
        bytes32 reeReceiptHash;
        uint256 anchoredAt;
        bool exists;
    }

    mapping(bytes32 => AnchorRecord) public records;

    function anchor(
        bytes32 experimentId,
        bytes32 agentReceiptHash,
        bytes32 modelReceiptHash,
        bytes32 reeReceiptHash
    ) external {
        require(!records[experimentId].exists, "Already anchored");
        records[experimentId] = AnchorRecord({
            agentReceiptHash: agentReceiptHash,
            modelReceiptHash: modelReceiptHash,
            reeReceiptHash: reeReceiptHash,
            anchoredAt: block.timestamp,
            exists: true
        });

        emit ExperimentAnchored(
            experimentId,
            agentReceiptHash,
            modelReceiptHash,
            reeReceiptHash,
            block.timestamp
        );
    }

    function verify(bytes32 experimentId) external view returns (bool) {
        return records[experimentId].exists;
    }

    function getRecord(bytes32 experimentId) external view returns (AnchorRecord memory) {
        return records[experimentId];
    }
}
