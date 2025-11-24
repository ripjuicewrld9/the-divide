import Item from '../models/Item.js';
import User from '../models/User.js';

export function setupItemRoutes(app, auth, adminOnly) {
  // Get all items
  app.get('/items', async (req, res) => {
    try {
      const items = await Item.find().sort({ createdAt: -1 });
      res.json({ items });
    } catch (err) {
      console.error('Error fetching items:', err);
      res.status(500).json({ error: 'Failed to fetch items' });
    }
  });

  // Get single item
  app.get('/items/:id', async (req, res) => {
    try {
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      res.json({ item });
    } catch (err) {
      console.error('Error fetching item:', err);
      res.status(500).json({ error: 'Failed to fetch item' });
    }
  });

  // Create item (admin only)
  app.post('/items', auth, adminOnly, async (req, res) => {
    try {
      const { name, price, image, rarity } = req.body;
      
      if (!name || price === undefined || !image) {
        return res.status(400).json({ error: 'Missing required fields: name, price, image' });
      }

      if (price < 0) {
        return res.status(400).json({ error: 'Price must be non-negative' });
      }

      const item = new Item({
        name,
        price,
        image,
        rarity: rarity || 'common',
      });

      await item.save();
      console.log('[Items] Created item:', item.name);
      res.json({ success: true, item });
    } catch (err) {
      console.error('Error creating item:', err);
      res.status(500).json({ error: 'Failed to create item' });
    }
  });

  // Update item (admin only)
  app.put('/items/:id', auth, adminOnly, async (req, res) => {
    try {
      const { name, price, image, rarity } = req.body;
      
      const item = await Item.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      if (name !== undefined) item.name = name;
      if (price !== undefined) {
        if (price < 0) return res.status(400).json({ error: 'Price must be non-negative' });
        item.price = price;
      }
      if (image !== undefined) item.image = image;
      if (rarity !== undefined) item.rarity = rarity;

      item.updatedAt = new Date();
      await item.save();
      
      console.log('[Items] Updated item:', item.name);
      res.json({ success: true, item });
    } catch (err) {
      console.error('Error updating item:', err);
      res.status(500).json({ error: 'Failed to update item' });
    }
  });

  // Delete item (admin only)
  app.delete('/items/:id', auth, adminOnly, async (req, res) => {
    try {
      const item = await Item.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      console.log('[Items] Deleted item:', item.name);
      res.json({ success: true, message: 'Item deleted' });
    } catch (err) {
      console.error('Error deleting item:', err);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  // Remove background from image (admin only)
  app.post('/remove-background', auth, adminOnly, async (req, res) => {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required' });
      }

      const apiKey = process.env.REMOVE_BG_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Background removal API not configured' });
      }

      console.log('[RemoveBG] Processing image:', imageUrl);

      // Step 1: Download the image from URL
      let imageBuffer;
      try {
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/',
            'Cache-Control': 'no-cache',
          },
          timeout: 10000,
        });
        if (!imageResponse.ok) {
          throw new Error(`HTTP ${imageResponse.status}`);
        }
        const arrayBuffer = await imageResponse.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        console.log('[RemoveBG] Downloaded image, size:', imageBuffer.length, 'bytes');
      } catch (err) {
        console.error('[RemoveBG] Failed to download image:', err.message);
        return res.status(400).json({ error: 'Failed to download image from URL: ' + err.message });
      }

      // Step 2: Convert to base64 for remove.bg
      const base64Image = imageBuffer.toString('base64');

      console.log('[RemoveBG] Calling remove.bg API with base64...');

      // Step 3: Call remove.bg API with base64
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_file_b64: base64Image,
          type: 'auto',
          format: 'png',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[RemoveBG] API Error:', error);
        return res.status(400).json({ error: 'Failed to remove background from image' });
      }

      // Step 4: Convert response to base64
      const resultBlob = await response.blob();
      const arrayBuffer = await resultBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      console.log('[RemoveBG] Successfully removed background');
      res.json({ success: true, imageUrl: dataUrl });
    } catch (err) {
      console.error('[RemoveBG] Error:', err);
      res.status(500).json({ error: 'Failed to process image: ' + err.message });
    }
  });

  // Image search using Google Custom Search Engine
  app.post('/search-images', auth, adminOnly, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || query.trim().length === 0) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const apiKey = process.env.GOOGLE_API_KEY;
      const cseId = process.env.GOOGLE_CSE_ID;

      if (!apiKey || !cseId) {
        console.error('[Search Images] Missing Google API credentials');
        return res.status(500).json({ error: 'Google Search API not configured' });
      }

      console.log('[Search Images] Searching Google Images for:', query);
      
      // Google Custom Search API - image search
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&cx=${cseId}&searchType=image&key=${apiKey}`,
        { method: 'GET' }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('[Search Images] Google API error:', data.error || response.status);
        return res.status(400).json({ error: 'Google search failed: ' + (data.error?.message || 'Unknown error') });
      }

      // Convert Google results to our format
      const results = (data.items || []).map((item) => ({
        image: item.link,
        thumbnail: item.image?.thumbnailLink,
        title: item.title,
        source: item.displayLink,
      }));

      console.log(`[Search Images] Found ${results.length} results for "${query}"`);
      res.json({ success: true, results });
    } catch (err) {
      console.error('[Search Images] Error:', err);
      res.status(500).json({ error: 'Failed to search images: ' + err.message });
    }
  });
}
