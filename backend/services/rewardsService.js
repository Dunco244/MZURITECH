const Rewards = require('../models/Rewards');

const POINTS_PER_100_KES = 1; // Keep in sync with RewardsRoute

async function getOrCreate(userId) {
  let rewards = await Rewards.findOne({ user: userId });
  if (!rewards) rewards = await Rewards.create({ user: userId });
  return rewards;
}

function calculatePoints(orderTotal) {
  if (!orderTotal || orderTotal <= 0) return 0;
  return Math.floor((orderTotal / 100) * POINTS_PER_100_KES);
}

async function awardOrderPoints(order) {
  if (!order || !order.user) return { awarded: false, points: 0 };
  if (order.pointsAwarded) return { awarded: false, points: 0 };

  const pointsEarned = calculatePoints(order.totalPrice);
  if (pointsEarned <= 0) {
    order.pointsAwarded = true;
    order.pointsEarned  = 0;
    await order.save();
    return { awarded: false, points: 0 };
  }

  const rewards = await getOrCreate(order.user);
  rewards.points      += pointsEarned;
  rewards.totalEarned += pointsEarned;
  rewards.transactions.push({
    type:        'earned',
    points:      pointsEarned,
    description: `Earned from purchase (KES ${Number(order.totalPrice).toLocaleString()})`,
    orderId:     order._id,
  });
  await rewards.save();

  order.pointsAwarded = true;
  order.pointsEarned  = pointsEarned;
  await order.save();

  return { awarded: true, points: pointsEarned, newBalance: rewards.points };
}

module.exports = {
  awardOrderPoints,
  calculatePoints,
};
