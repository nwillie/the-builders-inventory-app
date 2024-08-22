'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { firestore } from '../firebase';
import { Box, Modal, TextField, Typography, Stack, Button } from '@mui/material';
import { query, collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [sortAlphabetically, setSortAlphabetically] = useState(true);
  const [openSearch, setOpenSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [openNoResult, setOpenNoResult] = useState(false);
  const inventoryListRef = useRef(null);
  const [highlightedItem, setHighlightedItem] = useState(null);

  // Function to update the inventory from Firestore
  const updateInventory = useCallback(async () => {
    const snapshot = query(collection(firestore, 'inventory'));
    const docs = await getDocs(snapshot);
    const inventoryList = [];

    docs.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        ...doc.data(),
      });
    });

    // Sorting the inventory
    if (sortAlphabetically) {
      inventoryList.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      inventoryList.sort((a, b) => b.quantity - a.quantity);
    }

    setInventory(inventoryList);
  }, [sortAlphabetically]);

  const toggleSortMethod = () => {
    setSortAlphabetically((prevState) => !prevState);
    updateInventory();
  };

  // Remove one quantity of an item or delete it if quantity is 1
  const removeItem = async (item) => {
    const docRef = doc(firestore, 'inventory', item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      if (quantity === 1) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity: quantity - 1 });
      }
    }

    await updateInventory();
  };

  // Remove the entire item
  const removeEntireItem = async (item) => {
    const docRef = doc(firestore, "inventory", item);

    try {
      await deleteDoc(docRef);
      console.log(`Entire item '${item}' has been removed from the inventory.`);
      await updateInventory();
    } catch (error) {
      console.error("Error removing entire item:", error);
    }
  };

  // Add a quantity of an item
  const addItem = async (item, quantity) => {
    const docRef = doc(firestore, "inventory", item);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const { quantity: existingQuantity } = docSnap.data();
      await setDoc(docRef, { quantity: existingQuantity + quantity });
    } else {
      await setDoc(docRef, { quantity });
    }

    await updateInventory();
  };

  useEffect(() => {
    updateInventory();
  }, [updateInventory]);

  // Handlers for modals
  const handleOpen = () => {
    setOpen(true);
    setItemQuantity(1);
  };

  const handleClose = () => setOpen(false);

  const handleOpenSearch = () => {
    setOpenSearch(true);
    setSearchTerm("");
    setSearchResult(null);
  };

  const handleCloseSearch = () => {
    setOpenSearch(false);
    setSearchTerm("");
    setSearchResult(null);
  };

  const handleSearch = () => {
    const result = inventory.find(
      (item) => item.name.toLowerCase() === searchTerm.toLowerCase()
    );

    if (result) {
      setSearchResult(result);
      setOpenSearch(false);
      setHighlightedItem(result.name);

      setTimeout(() => {
        setHighlightedItem(null);
      }, 3000);
    } else {
      setOpenNoResult(true);
    }
  };

  const handleNoResultClose = () => setOpenNoResult(false);

  // Styling for modals
  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    boxShadow: 24,
    p: 4,
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {/* Add Item Modal */}
      <Modal open={open} onClose={handleClose}>
        <Box sx={style}>
          <Typography variant="h6" component="h2">
            Add Item
          </Typography>
          <TextField
            fullWidth
            label="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            value={itemQuantity}
            onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
            margin="normal"
          />
          <Button
            variant="contained"
            onClick={() => {
              addItem(itemName, itemQuantity);
              setItemName('');
              setItemQuantity(1);
              handleClose();
            }}
            disabled={!itemName}
          >
            Add
          </Button>
        </Box>
      </Modal>

      {/* Search Item Modal */}
      <Modal open={openSearch} onClose={handleCloseSearch}>
        <Box sx={style}>
          <Typography variant="h6" component="h2">
            Search Item
          </Typography>
          <TextField
            fullWidth
            label="Search Term"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            margin="normal"
          />
          <Button variant="contained" onClick={handleSearch}>
            Search
          </Button>
        </Box>
      </Modal>

      {/* No Search Result Modal */}
      <Modal open={openNoResult} onClose={handleNoResultClose}>
        <Box sx={style}>
          <Typography variant="h6">Item Not Found</Typography>
          <Button variant="contained" onClick={handleNoResultClose}>
            Close
          </Button>
        </Box>
      </Modal>

      {/* Inventory List */}
      <Box width="80%" maxWidth="600px" mt={4}>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Button variant="contained" onClick={toggleSortMethod}>
            Sort {sortAlphabetically ? 'A-Z' : 'Quantity'}
          </Button>
          <Button variant="contained" onClick={handleOpen}>
            Add Item
          </Button>
          <Button variant="contained" onClick={handleOpenSearch}>
            Search
          </Button>
        </Stack>

        <Box height="400px" overflow="auto" border="1px solid #333">
          {inventory.map(({ name, quantity }) => (
            <Box
              key={name}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              bgcolor={highlightedItem === name ? 'lightgreen' : 'white'}
              borderBottom="1px solid #ddd"
            >
              <Typography>{name.charAt(0).toUpperCase() + name.slice(1)}</Typography>
              <Typography>Quantity: {quantity}</Typography>
              <Box>
                <Button onClick={() => addItem(name, 1)}>Add</Button>
                <Button onClick={() => removeItem(name)}>Remove</Button>
                <Button onClick={() => removeEntireItem(name)}>Delete</Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
