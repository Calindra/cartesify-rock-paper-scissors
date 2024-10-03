import { PAIO_NONCE_URL, PAIO_TRANSACTION_URL } from "./constants";
import { ethers } from "ethers";

const app = "0xab7528bb862fb57e8a2bcd567a2e929a0be56a5e";

let typedData = {
    domain: {
        name: "Cartesi",
        version: "0.1.0",
        chainId: 31337,
        verifyingContract:
            "0x0000000000000000000000000000000000000000",
    } as const,
    types: {
        EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
        ],
        CartesiMessage: [
            { name: "app", type: "address" },
            { name: "nonce", type: "uint64" },
            { name: "max_gas_price", type: "uint128" },
            { name: "data", type: "bytes" },
        ],
    } as const,
    primaryType: "CartesiMessage" as const,
    message: {
        app: "0x",
        nonce: 0,
        data: "0x",
        max_gas_price: 10
    },
}

let types = {
 
    CartesiMessage: [
        { name: "app", type: "address" },
        { name: "nonce", type: "uint64" },
        { name: "max_gas_price", type: "uint128" },
        { name: "data", type: "bytes" },
    ],
}

export const fetchNonce = async (user: any) => {
    const response = await fetch(PAIO_NONCE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ msg_sender: user, app_contract: app })
    });

    const responseData = await response.json();
    const nextNonce = responseData.nonce;
    return Number(nextNonce)
}

export const submitTransaction = async(payload: any, signer: any) => {
    const account = await signer.getAddress();

    console.log(`Getting nonce`)

    const nonce = await fetchNonce(account);

    console.log(`Nonce is ${nonce}`)

    const payloadJSON = JSON.stringify(payload)
    const payloadBytes = ethers.toUtf8Bytes(payloadJSON)
    const hexPayload =  ethers.hexlify(payloadBytes)

    const message = {
        app,
        nonce: nonce,
        data: hexPayload,
        max_gas_price: Number(10),
    };

    console.log(message)

    typedData.message = message

    console.log("account", account)
    console.log(typedData)

    const signature = await signer.signTypedData(
        typedData.domain,  
        types,   
        typedData.message 
    );

     // Enviar para Paio
     return await submitToPaio({typedData, account, signature});
}

export const submitToPaio = async(fullBody: any) => {
    const body = JSON.stringify(fullBody)
        const response = await fetch(PAIO_TRANSACTION_URL, {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            console.log("submit to Paio failed")
            throw new Error("submit to Paio failed: " + response.text())
        } else {
            return response.json()
        }
}
