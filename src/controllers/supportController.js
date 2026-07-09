const { successResponse } = require('../utils/apiResponse');

/**
 * SupportController — handles POST /api/support requests.
 */
class SupportController {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * Process a customer support request through the AI pipeline.
   */
  handleSupportRequest = async (req, res, next) => {
    try {
      const result = await this.orchestrator.process(req.body, req.requestId);

      res.status(200).json(
        successResponse(result.toJSON(), { requestId: req.requestId })
      );
    } catch (error) {
      next(error);
    }
  };
}

module.exports = SupportController;
