import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Textarea,
  Checkbox,
  Text,
  Flex,
  useClipboard
} from '@chakra-ui/react';
import { generateWallet, downloadKeyJSON } from '../lib/walletGen';

export function WalletConnect() {
  const [hasWallet, setHasWallet] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [walletInfo, setWalletInfo] = useState({ secretBase58: '', secretArray: [] as number[] });
  const [hasImported, setHasImported] = useState(false);
  const { hasCopied, onCopy } = useClipboard(walletInfo.secretBase58);

  useEffect(() => {
    const storedPubKey = localStorage.getItem('ceelo_pub');
    setHasWallet(!!storedPubKey);
  }, []);

  const handleGenerateWallet = async () => {
    const wallet = await generateWallet();
    setWalletInfo({ secretBase58: wallet.secretBase58, secretArray: wallet.secretArray });
    setShowModal(true);
    setHasWallet(true);
  };

  const handleDownloadJson = () => {
    downloadKeyJSON(walletInfo.secretArray);
  };

  return (
    <>
      {!hasWallet ? (
        <Button colorScheme="blue" onClick={handleGenerateWallet}>
          Generate Wallet
        </Button>
      ) : (
        <Button colorScheme="green" isDisabled={!hasImported}>
          Play
        </Button>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save Your Private Key</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Private key (Base58 – paste into Phantom):
            </Text>
            <Textarea
              value={walletInfo.secretBase58}
              isReadOnly
              mb={4}
            />
            <Flex mb={4}>
              <Button onClick={onCopy} mr={2}>
                {hasCopied ? "Copied!" : "Copy Base58 Key"}
              </Button>
              <Button onClick={handleDownloadJson}>
                Download JSON
              </Button>
            </Flex>
            <Text fontSize="sm" mb={4}>
              1. Copy the Base58 private key above<br />
              2. Open Phantom → Settings → Add / Connect Wallet → Import Private Key<br />
              3. Paste the Base58 key to import your wallet into Phantom
            </Text>
            <Checkbox
              isChecked={hasImported}
              onChange={(e) => setHasImported(e.target.checked)}
            >
              I have imported this key into Phantom
            </Checkbox>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
