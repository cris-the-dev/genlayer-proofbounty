"use client";

import { useState } from "react";
import { User, LogOut, AlertCircle, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/genlayer/wallet";
import { useContributor } from "@/lib/hooks/useProofBounty";
import { formatGen } from "@/lib/format";
import { success, error, userRejected } from "@/lib/utils/toast";
import { AddressDisplay } from "./AddressDisplay";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const METAMASK_INSTALL_URL = "https://metamask.io/download/";

export function AccountPanel() {
  const {
    address,
    isConnected,
    isMetaMaskInstalled,
    isOnCorrectNetwork,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
  } = useWallet();

  const { data: contributor } = useContributor(address);
  const points = contributor ? `${formatGen(contributor.earned, 2)} GEN` : "0 GEN";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleConnect = async () => {
    if (!isMetaMaskInstalled) {
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError("");
      await connectWallet();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to connect wallet:", err);
      setConnectionError(err.message || "Failed to connect to MetaMask");

      if (err.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else {
        error("Failed to connect wallet", {
          description: err.message || "Check your MetaMask and try again."
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsModalOpen(false);
  };

  const handleSwitchAccount = async () => {
    try {
      setIsSwitching(true);
      setConnectionError("");
      await switchWalletAccount();
      // Keep modal open to show new account info
    } catch (err: any) {
      console.error("Failed to switch account:", err);

      // Don't show error if user cancelled
      if (!err.message?.includes("rejected")) {
        setConnectionError(err.message || "Failed to switch account");
        error("Failed to switch account", {
          description: err.message || "Please try again."
        });
      } else {
        userRejected("Account switch cancelled");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={isLoading}>
            Connect wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="panel">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Connect to GenLayer
            </DialogTitle>
            <DialogDescription>
              Connect your MetaMask wallet to start betting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {!isMetaMaskInstalled ? (
              <>
                <Alert variant="default" className="bg-secondary border-border">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>MetaMask Not Detected</AlertTitle>
                  <AlertDescription>
                    Please install MetaMask to continue. MetaMask is a crypto
                    wallet that allows you to interact with blockchain applications.
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={() => window.open(METAMASK_INSTALL_URL, "_blank")}
                  variant="default"
                  className="w-full h-14 text-lg"
                >
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Install MetaMask
                </Button>

                <div className="p-4 rounded-lg bg-secondary border border-border">
                  <p className="text-xs text-muted-foreground">
                    After installing MetaMask, refresh this page and click
                    &quot;Connect Wallet&quot; again.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Button
                  onClick={handleConnect}
                  variant="default"
                  className="w-full h-14 text-lg"
                  disabled={isConnecting}
                >
                  <User className="w-5 h-5 mr-2" />
                  {isConnecting ? "Connecting..." : "Connect MetaMask"}
                </Button>

                {connectionError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription>{connectionError}</AlertDescription>
                  </Alert>
                )}

                <div className="p-4 rounded-lg bg-secondary border border-border">
                  <p className="text-xs text-muted-foreground">
                    This will open MetaMask and prompt you to:
                  </p>
                  <ol className="text-xs text-muted-foreground list-decimal list-inside mt-2 space-y-1">
                    <li>Connect your wallet to this application</li>
                    <li>Add the GenLayer network to MetaMask</li>
                    <li>Switch to the GenLayer network</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Connected state
  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <div className="flex items-center gap-2">
        <div className="border border-border rounded-md px-3 h-9 flex items-center gap-3 font-mono text-xs">
          <AddressDisplay address={address} maxLength={12} />
          <span className="text-muted-foreground tabular-nums" title="Earned from bounties">{points}</span>
        </div>

        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <User className="w-4 h-4" />
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent className="panel">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Wallet Details
          </DialogTitle>
          <DialogDescription>
            Your connected MetaMask wallet information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="panel p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Your Address</p>
            <code className="text-sm font-mono break-all">{address}</code>
          </div>

          <div className="panel p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Earned from bounties</p>
            <p className="font-mono text-lg tabular-nums">{points}</p>
          </div>

          <div className="panel p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Network Status</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isOnCorrectNetwork
                    ? "bg-green-500"
                    : "bg-yellow-500 animate-pulse"
                }`}
              />
              <span className="text-sm">
                {isOnCorrectNetwork
                  ? "Connected to GenLayer"
                  : "Wrong Network"}
              </span>
            </div>
          </div>

          {!isOnCorrectNetwork && (
            <Alert variant="default" className="bg-secondary border-border">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertTitle>Network Warning</AlertTitle>
              <AlertDescription>
                You&apos;re not on the GenLayer network. Please switch networks in
                MetaMask or try reconnecting.
              </AlertDescription>
            </Alert>
          )}

          {connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="mt-6 pt-4 border-t border-border space-y-3">
            <Button
              onClick={handleSwitchAccount}
              variant="outline"
              className="w-full"
              disabled={isSwitching || isLoading}
            >
              <User className="w-4 h-4 mr-2" />
              {isSwitching ? "Switching..." : "Switch Account"}
            </Button>

            <Button
              onClick={handleDisconnect}
              className="w-full text-destructive hover:text-destructive"
              variant="outline"
              disabled={isSwitching || isLoading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect Wallet
            </Button>
          </div>

          <div className="p-4 rounded-lg bg-secondary border border-border">
            <p className="text-xs text-muted-foreground">
              Use &quot;Switch Account&quot; to select a different MetaMask
              account. Use &quot;Disconnect&quot; to remove this site from
              MetaMask.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
