/**
 * Pagination Helper
 * Provides pagination functionality for API routes
 */

/**
 * Paginate query results
 * @param {Object} model - Mongoose model
 * @param {Object} query - Query object with filters
 * @param {Object} options - Pagination options
 * @returns {Object} Pagination result with data and metadata
 */
const paginate = async (model, query = {}, options = {}) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const sort = options.sort || { createdAt: -1 };
  const select = options.select || '';
  const populate = options.populate || '';

  const skip = (page - 1) * limit;

  // Execute query with pagination
  let queryExec = model.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Apply select if provided
  if (select) {
    queryExec = queryExec.select(select);
  }

  // Apply populate if provided
  if (populate) {
    if (typeof populate === 'string') {
      queryExec = queryExec.populate(populate);
    } else if (Array.isArray(populate)) {
      populate.forEach(p => {
        queryExec = queryExec.populate(p);
      });
    } else if (typeof populate === 'object') {
      queryExec = queryExec.populate(populate);
    }
  }

  const [data, total] = await Promise.all([
    queryExec.exec(),
    model.countDocuments(query)
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    pages,
    hasNextPage: page < pages,
    hasPrevPage: page > 1,
    nextPage: page < pages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null
  };
};

/**
 * Simple pagination response formatter
 * @param {Array} data - Array of data
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} Formatted pagination response
 */
const paginationResponse = (data, total, page, limit) => {
  const pages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1
    }
  };
};

module.exports = {
  paginate,
  paginationResponse
};

