const constants = {
  errors: {
    ERR_REQ_READ_BODY: 'Error with reading request body',
    ERR_REQ_PARSE_BODY: 'Error with parsing request body',
    ERR_REQ_BODY_CONTENT: 'Request body content is not valid',

    ERR_RES_PACKAGE_BODY: 'Error with packaging response body',

    ERR_ENCRYPT: 'Cannot encrypt state',
    ERR_DECRYPT: 'Cannot decrypt state',
  },

  handleTypes: {
    ABORT: '$$CALLO_ABORT',
    ORDER: '$$CALLO_ORDER',
    ORDER_REWIND: '$$CALLO_ORDER_REWIND',
    ORDER_JUMP: '$$CALLO_ORDER_JUMP',

    REWIND: '$$CALLO_REWIND',
    JUMP: '$$CALLO_JUMP',
    NEXT: '$$CALLO_NEXT',
  },

  reserved: {
    FLOW_ID: '$$FLOW_ID',
  }
};

module.exports = constants;