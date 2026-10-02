function paginate({ page = 1, limit = 10 } = {}) {
  return { skip: (page - 1) * limit, limit };
}

function buildMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
}

module.exports = { paginate, buildMeta };
