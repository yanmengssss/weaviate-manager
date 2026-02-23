import weaviate, { WeaviateClient } from 'weaviate-client';

export async function getWeaviateClient(url: string, apiKey?: string): Promise<WeaviateClient> {
    try {
        const urlObj = new URL(url);
        const host = urlObj.host;
        const scheme = urlObj.protocol.replace(':', '');
        const isSecure = scheme === 'https';

        let client: WeaviateClient;

        // Simplify connection by using the host and protocol directly
        // Weaviate v3 client connectToCustom allows specifying both HTTP and GRPC
        const customParams: any = {
            httpHost: host,
            httpSecure: isSecure,
            grpcHost: host,
            grpcSecure: isSecure,
        };

        if (apiKey) {
            // Using standard v3 auth credentials configuration
            customParams.authCredentials = new weaviate.ApiKey(apiKey);
        }

        // Connect to custom endpoint
        client = await weaviate.connectToCustom(customParams);
        return client;
    } catch (error) {
        console.error("Failed to initialize Weaviate client:", error);
        throw error;
    }
}
