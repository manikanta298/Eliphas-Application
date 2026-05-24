const ActivityLog = require('../models/ActivityLog');

exports.logActivity = (action, module) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (data.success !== false && req.user) {
      try {
        await ActivityLog.create({
          user: req.user._id,
          userName: req.user.name,
          action,
          module,
          targetId: req.params.id || data.data?._id,
          targetModel: module,
          description: `${action} on ${module}`,
          before: req.originalData,
          after: data.data,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      } catch (e) {
        console.error('Activity log error:', e.message);
      }
    }
    return originalJson(data);
  };
  next();
};
