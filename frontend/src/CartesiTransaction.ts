import { PAIO_NONCE_URL, PAIO_TRANSACTION_URL } from "./constants";
import { AbiCoder, ethers } from "ethers";

const app = "0xab7528bb862fb57e8a2bcd567a2e929a0be56a5e";

let typedData = {
    account: "0x" as any,
    domain: {
        name: "Cartesi",
        version: "0.1.0",
        chainId: 31337,
        verifyingContract:
            "0x0000000000000000000000000000000000000000",
    } as const,
    types: {
      
        CartesiMessage: [
            { name: "app", type: "address" },
            { name: "nonce", type: "uint64" },
            { name: "max_gas_price", type: "uint128" },
            { name: "data", type: "bytes" },
        ],
    } as const,
    primaryType: "CartesiMessage" as const,
    message: { nonce: BigInt(0), data: "0x" },
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
    return BigInt(nextNonce)
}

export const submitTransaction = async(payload: any, signer: any) => {
    const account = await signer.getAddress();

    typedData.account = account

    console.log(`Getting nonce`)

    const nonce = await fetchNonce(account);

    console.log(`Nonce is ${nonce}`)

    const payloadJSON = JSON.stringify(payload)
    const payloadBytes = ethers.toUtf8Bytes(payloadJSON)

    const message = {
        app,
        nonce: BigInt(nonce),
        data: payloadBytes,
        max_gas_price: BigInt(10),
    };

    typedData.message = message

    const signature = await signer.signTypedData(
        typedData.domain,
        typedData.types,
        typedData.message
    );

    console.log("Enconding ABI")

    // Codificar a mensagem para envio
    const abiEncoder = new AbiCoder();
    const hexData = abiEncoder.encode(
        ['address', 'uint64', 'uint128', 'bytes'],
        [message.app, message.nonce, message.max_gas_price, message.data]
    );

    // Decodificar para validar
    const decoded = abiEncoder.decode(
        ['address', 'uint64', 'uint128', 'bytes'],
        hexData
    );
    console.log(...decoded);
    console.log({ hexData });

     console.log("Sending to Paio")

     // Enviar para Paio
     return await submitToPaio(signature, hexData);
}

export const submitToPaio = async(signature: any, message: any) => {
    const body = JSON.stringify({
        signature,
        message,
    })

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
