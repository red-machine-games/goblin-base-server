'use strict';

const DEFAULT_CHAT_GROUP_WHITELIST = [],
    DEFAULT_SUBSCRIPTION_LIFETIME_MS = 15000,
    DEFAULT_LONG_POLLING_COLD_RESPONSE_AFTER_MS = 5000,
    DEFAULT_CHANNEL_NAME = 'grchat',
    DEFAULT_MAX_LISTING_LIMIT_VALUE = 20,
    DEFAULT_SUBSCRIPTIONS_REFRESH_BATCH_SIZE = 100,
    DEFAULT_SUBSCRIPTIONS_REFRESH_RELOADING_TIME_MS = 1000,
    DEFAULT_MAX_INBOX_PER_BUCKET = 50,
    DEFAULT_MESSAGE_MAX_SIZE = 1024,
    DEFAULT_LAZY_NO_REFRESH_CHATS_MS = 500,
    DEFAULT_MAX_MESSAGES_BACKLOG = 50,
    DEFAULT_MAX_MESSAGE_TTL_MS = 1000 * 60 * 60 * 24 * 7,
    DEFAULT_REFRESH_MAX_BATCH_SIZE = 50,
    DEFAULT_REFRESH_PACKAGE_TIMEOUT = 1000;

var validate = require('./utils/validateConfigs.js');

class ChatsConfig{
    constructor(opts){
        this.chatGroupWhitelist = opts.chatGroupWhitelist != null
            ? opts.chatGroupWhitelist
            : DEFAULT_CHAT_GROUP_WHITELIST;
        this.subscriptionLifetime = opts.subscriptionLifetime != null
            ? opts.subscriptionLifetime
            : DEFAULT_SUBSCRIPTION_LIFETIME_MS;
        this.longPollingColdResponseAfterMs = opts.longPollingColdResponseAfterMs != null
            ? opts.longPollingColdResponseAfterMs
            : DEFAULT_LONG_POLLING_COLD_RESPONSE_AFTER_MS;
        this.channelName = DEFAULT_CHANNEL_NAME;
        this.maxListingLimitValue = opts.maxListingLimitValue != null
            ? opts.maxListingLimitValue
            : DEFAULT_MAX_LISTING_LIMIT_VALUE;
        this.subscriptionRefreshBatchSize = opts.subscriptionRefreshBatchSize != null
            ? opts.subscriptionRefreshBatchSize
            : DEFAULT_SUBSCRIPTIONS_REFRESH_BATCH_SIZE;
        this.subscriptionRefreshReloadingTimeMs = opts.subscriptionRefreshReloadingTimeMs != null
            ? opts.subscriptionRefreshReloadingTimeMs
            : DEFAULT_SUBSCRIPTIONS_REFRESH_RELOADING_TIME_MS;
        this.maxInboxPerBucket = opts.maxInboxPerBucket != null
            ? opts.maxInboxPerBucket
            : DEFAULT_MAX_INBOX_PER_BUCKET;
        this.messageMaxSize = opts.messageMaxSize != null
            ? opts.messageMaxSize
            : DEFAULT_MESSAGE_MAX_SIZE;
        this.lazyNoRefreshChatsMs = opts.lazyNoRefreshChatsMs != null
            ? opts.lazyNoRefreshChatsMs
            : DEFAULT_LAZY_NO_REFRESH_CHATS_MS;
        this.maxMessagesBacklog = opts.maxMessagesBacklog != null
            ? opts.maxMessagesBacklog
            : DEFAULT_MAX_MESSAGES_BACKLOG;
        this.maxMessageTtlMs = opts.maxMessageTtlMs != null
            ? opts.maxMessageTtlMs
            : DEFAULT_MAX_MESSAGE_TTL_MS;
        this.refreshMaxBatchSize = opts.refreshMaxBatchSize != null
            ? opts.refreshMaxBatchSize
            : DEFAULT_REFRESH_MAX_BATCH_SIZE;
        this.refreshPackageTimeout = opts.refreshPackageTimeout != null
            ? opts.refreshPackageTimeout
            : DEFAULT_REFRESH_PACKAGE_TIMEOUT;

        this._validateIt();
    }
    _validateIt(){
        validate.isArray(this.chatGroupWhitelist, 'chatGroupWhitelist');
        validate.isNumber(this.subscriptionLifetime, 'subscriptionLifetime');
        validate.isNumber(this.longPollingColdResponseAfterMs, 'longPollingColdResponseAfterMs');
        validate.isString(this.channelName, 'channelName');
        validate.isNumber(this.maxListingLimitValue, 'maxListingLimitValue');
        validate.isNumber(this.subscriptionRefreshBatchSize, 'subscriptionRefreshBatchSize');
        validate.isNumber(this.subscriptionRefreshReloadingTimeMs, 'subscriptionRefreshReloadingTimeMs');
        validate.isNumber(this.maxInboxPerBucket, 'maxInboxPerBucket');
        validate.isNumber(this.messageMaxSize, 'messageMaxSize');
        validate.isNumber(this.lazyNoRefreshChatsMs, 'lazyNoRefreshChatsMs');
        validate.isNumber(this.maxMessagesBacklog, 'maxMessagesBacklog');
        validate.isNumber(this.maxMessageTtlMs, 'maxMessageTtlMs');
        validate.isNumber(this.refreshMaxBatchSize, 'refreshMaxBatchSize');
        validate.isNumber(this.refreshPackageTimeout, 'refreshPackageTimeout');
    }
}

module.exports = ChatsConfig;