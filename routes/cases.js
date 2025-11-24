// routes/cases.js
import Case from '../models/Case.js';
import User from '../models/User.js';
import { nanoid } from 'nanoid';

export default function registerCases(app, io, { auth, adminOnly } = {}) {
  // POST /cases/create - Create a new case
  app.post('/cases/create', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { name, description, image, items, isPublic, houseEdge } = req.body;

      if (!name || !items || items.length === 0) {
        return res.status(400).json({ error: 'Case name and items are required' });
      }

      if (items.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 items per case' });
      }

      // Validate houseEdge
      let finalHouseEdge = 10; // default 10%
      if (houseEdge !== undefined) {
        const edgeNum = Number(houseEdge);
        if (edgeNum < 1 || edgeNum > 50) {
          return res.status(400).json({ error: 'House edge must be between 1 and 50' });
        }
        finalHouseEdge = edgeNum;
      }

      // Validate items
      let totalValue = 0;
      let totalChance = 0;
      
      if (items && items[0]) {
        console.log('[CaseCreate] First incoming item:', JSON.stringify({
          name: items[0].name,
          hasImage: !!items[0].image,
          imageLength: items[0].image?.length || 0,
          allKeys: Object.keys(items[0])
        }));
      }
      
      const validatedItems = items.map((item) => {
        if (!item.name || item.value === undefined || item.value < 0.01) {
          throw new Error('Each item must have a name and value >= $0.01');
        }
        if (item.chance === undefined || item.chance < 0 || item.chance > 100) {
          throw new Error('Each item must have a chance between 0 and 100');
        }
        totalValue += item.value;
        totalChance += item.chance;
        const validated = {
          name: item.name.slice(0, 100),
          value: item.value,
          chance: item.chance,
          color: item.color || '#808080',
          // rarity is auto-calculated in pre-save hook
        };
        // Only set image if it's provided
        if (item.image) {
          validated.image = item.image;
        }
        return validated;
      });

      if (totalValue === 0) {
        return res.status(400).json({ error: 'Case total value must be > $0.00' });
      }
      
      if (Math.abs(totalChance - 100) > 0.01) {
        return res.status(400).json({ error: `Item chances must total 100% (currently ${totalChance}%)` });
      }

      // Create case
      const caseObj = new Case({
        id: nanoid(8),
        creatorId: userId,
        creatorUsername: (await User.findById(userId)).username,
        name: name.slice(0, 100),
        description: description ? description.slice(0, 500) : '',
        image: image || undefined, // case card image URL
        items: validatedItems,
        totalValue,
        houseEdge: finalHouseEdge,
        isPublic: isPublic !== false, // default true
      });

      await caseObj.save();

      res.json({ success: true, case: caseObj });
    } catch (err) {
      console.error('Error creating case:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /cases - List user's own cases
  app.get('/cases', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const userCases = await Case.find({ creatorId: userId }).sort({ createdAt: -1 });
      res.json({ cases: userCases });
    } catch (err) {
      console.error('Error fetching user cases:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /cases/public - List all public cases (for case browser)
  app.get('/cases/public', async (req, res) => {
    try {
      const publicCases = await Case.find({ isPublic: true, status: 'active' }).sort({ usageCount: -1 });
      res.json({ cases: publicCases });
    } catch (err) {
      console.error('Error fetching public cases:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /cases/:caseId - Get a specific case by ID
  app.get('/cases/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const caseObj = await Case.findOne({ $or: [{ id: caseId }, { _id: caseId }] });
      if (!caseObj) return res.status(404).json({ error: 'Case not found' });
      res.json({ case: caseObj });
    } catch (err) {
      console.error('Error fetching case:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT /cases/:caseId - Update a case (owner only, or admin)
  app.put('/cases/:caseId', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { caseId } = req.params;
      const { name, description, image, items, isPublic, status, houseEdge } = req.body;

      const caseObj = await Case.findOne({ $or: [{ id: caseId }, { _id: caseId }] });
      if (!caseObj) return res.status(404).json({ error: 'Case not found' });

      // Check if user is owner or admin
      const user = await User.findById(userId);
      const isOwner = caseObj.creatorId.toString() === userId;
      const isAdmin = user && user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to edit this case' });
      }

      // Check if case is in use (usage count > 0)
      // Admins can force-edit; regular users cannot
      if (caseObj.usageCount > 0 && !isAdmin) {
        return res.status(400).json({ error: 'Cannot edit case that is in use' });
      }

      // Update fields if provided
      if (name) {
        caseObj.name = name.slice(0, 100);
      }
      if (description !== undefined) {
        caseObj.description = description ? description.slice(0, 500) : '';
      }
      if (image !== undefined) {
        caseObj.image = image || undefined;
      }
      if (isPublic !== undefined) {
        caseObj.isPublic = isPublic;
      }
      if (status) {
        caseObj.status = status;
      }
      if (houseEdge !== undefined) {
        const edgeNum = Number(houseEdge);
        if (edgeNum < 1 || edgeNum > 50) {
          return res.status(400).json({ error: 'House edge must be between 1 and 50' });
        }
        caseObj.houseEdge = edgeNum;
      }

      // Update items if provided
      if (items && items.length > 0) {
        if (items.length > 50) {
          return res.status(400).json({ error: 'Maximum 50 items per case' });
        }

        if (items && items[0]) {
          console.log('[CaseUpdate] First incoming item:', JSON.stringify({
            name: items[0].name,
            hasImage: !!items[0].image,
            imageLength: items[0].image?.length || 0,
            allKeys: Object.keys(items[0])
          }));
        }

        let totalValue = 0;
        let totalChance = 0;
        const validatedItems = items.map((item) => {
          if (!item.name || item.value === undefined || item.value < 0.009) {
            throw new Error('Each item must have a name and value >= $0.01');
          }
          if (item.chance === undefined || item.chance < 0 || item.chance > 100) {
            throw new Error('Each item must have a chance between 0 and 100');
          }
          totalValue += item.value;
          totalChance += item.chance;
          const validated = {
            name: item.name.slice(0, 100),
            value: item.value,
            chance: item.chance,
            rarity: item.rarity || 'common',
            color: item.color || '#808080',
          };
          // Only set image if it's provided, don't set it to undefined
          if (item.image) {
            validated.image = item.image;
          } else {
            // Preserve existing image from the case if the incoming item doesn't have one
            const existingItem = caseObj.items.find(i => i.name === item.name && i.value === item.value);
            if (existingItem && existingItem.image) {
              validated.image = existingItem.image;
            }
          }
          return validated;
        });

        if (Math.abs(totalChance - 100) > 0.01) {
          return res.status(400).json({ error: `Item chances must total 100% (currently ${totalChance}%)` });
        }

        caseObj.items = validatedItems;
        caseObj.totalValue = totalValue;
      }

      await caseObj.save();

      res.json({ success: true, case: caseObj });
    } catch (err) {
      console.error('Error updating case:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /cases/:caseId - Delete a case (owner only, or admin)
  app.delete('/cases/:caseId', auth, async (req, res) => {
    try {
      const userId = req.userId;
      const { caseId } = req.params;

      const caseObj = await Case.findOne({ $or: [{ id: caseId }, { _id: caseId }] });
      if (!caseObj) return res.status(404).json({ error: 'Case not found' });

      // Check if user is owner or admin
      const user = await User.findById(userId);
      const isOwner = caseObj.creatorId.toString() === userId;
      const isAdmin = user && user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this case' });
      }

      // Check if case is in use
      if (caseObj.usageCount > 0) {
        return res.status(400).json({ error: 'Cannot delete case that is in use' });
      }

      await Case.deleteOne({ _id: caseObj._id });

      res.json({ success: true, message: 'Case deleted' });
    } catch (err) {
      console.error('Error deleting case:', err);
      res.status(500).json({ error: err.message });
    }
  });
}
