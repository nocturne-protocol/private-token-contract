#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

echo "Running tests on Arbitrum Sepolia fork..."
echo "RPC URL: $ARBITRUM_SEPOLIA_RPC_URL"
echo ""

# Run forge tests with Arbitrum Sepolia fork
ARBITRUM_SEPOLIA_RPC_URL=$ARBITRUM_SEPOLIA_RPC_URL forge test -vv --fork-url $ARBITRUM_SEPOLIA_RPC_URL