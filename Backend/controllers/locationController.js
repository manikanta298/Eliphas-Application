const Location = require('../models/Location');

// Get all locations (optionally filtered by site/parent)
exports.getLocations = async (req, res) => {
  try {
    const { site, parent, level, search } = req.query;
    const filter = { isDeleted: false, isActive: true };

    if (site)   filter.site   = site;
    if (level)  filter.level  = Number(level);
    if (parent === 'root') filter.parent = null;
    else if (parent) filter.parent = parent;

    if (search) filter.name = { $regex: search, $options: 'i' };

    const locations = await Location.find(filter)
      .populate('parent', 'name fullPath')
      .populate('site', 'name')
      .sort({ level: 1, name: 1 });

    res.json({ success: true, data: locations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get full tree structure for a site
exports.getLocationTree = async (req, res) => {
  try {
    const { site } = req.query;
    const filter = { isDeleted: false, isActive: true };
    if (site) filter.site = site;

    const all = await Location.find(filter).sort({ level: 1, name: 1 }).lean();

    // Build tree
    const buildTree = (items, parentId = null) => {
      return items
        .filter(i => String(i.parent || null) === String(parentId))
        .map(i => ({ ...i, children: buildTree(items, i._id) }));
    };

    const tree = buildTree(all);
    res.json({ success: true, data: tree, flat: all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get children of a location (for cascading dropdowns)
exports.getChildren = async (req, res) => {
  try {
    const children = await Location.find({
      parent: req.params.id, isDeleted: false, isActive: true,
    }).sort({ name: 1 });
    res.json({ success: true, data: children });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createLocation = async (req, res) => {
  try {
    const location = await Location.create({ ...req.body, createdBy: req.user._id });
    await location.populate('parent site');
    res.status(201).json({ success: true, data: location });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('parent site');
    if (!location) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: location });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteLocation = async (req, res) => {
  try {
    // Check if any children exist
    const children = await Location.countDocuments({ parent: req.params.id, isDeleted: false });
    if (children > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete — ${children} sub-locations exist. Delete them first.` });
    }
    await Location.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Seed default locations (Kakinada hierarchy example)
exports.seedLocations = async (req, res) => {
  try {
    const count = await Location.countDocuments();
    if (count > 0) return res.json({ success: true, message: 'Locations already exist' });

    // Level 1 - Districts
    const kakinada = await Location.create({ name: 'Kakinada', type: 'district', level: 1 });
    const vizag    = await Location.create({ name: 'Visakhapatnam', type: 'district', level: 1 });

    // Level 2 - Mandals
    const sarpavaram = await Location.create({ name: 'Sarpavaram', type: 'mandal', parent: kakinada._id });
    const pithapuram = await Location.create({ name: 'Pithapuram',  type: 'mandal', parent: kakinada._id });
    const gajuwaka   = await Location.create({ name: 'Gajuwaka',    type: 'mandal', parent: vizag._id });

    // Level 3 - Villages
    await Location.create({ name: 'Timmapur',    type: 'village', parent: sarpavaram._id });
    await Location.create({ name: 'Panasapadu',  type: 'village', parent: sarpavaram._id });
    await Location.create({ name: 'Giri Nagar',  type: 'village', parent: gajuwaka._id });

    const all = await Location.find().sort({ level: 1, name: 1 });
    res.json({ success: true, message: 'Default locations seeded', data: all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
