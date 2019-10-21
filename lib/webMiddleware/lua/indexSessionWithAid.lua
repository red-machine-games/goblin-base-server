local UNICORN = KEYS[1]
local ACCOUNT_ID = KEYS[2]
local SESSION_LIFETIME = KEYS[3]

local existing_aid_index = redis.call('get', 'sess_aid:' .. ACCOUNT_ID)

if existing_aid_index and existing_aid_index ~= UNICORN then
    local unic_hid = redis.call('get', 'unic_hid:' .. existing_aid_index)
    if unic_hid then
        redis.call('del',
            'sess:' .. existing_aid_index, 'sexp:' .. existing_aid_index,
            'unic_aid:' .. existing_aid_index, 'sess_aid:' .. ACCOUNT_ID,
            'unic_hid:' .. existing_aid_index, 'sess_hid:' .. unic_hid
        )
    else
        redis.call('del',
            'sess:' .. existing_aid_index, 'sexp:' .. existing_aid_index,
            'unic_aid:' .. existing_aid_index, 'sess_aid:' .. ACCOUNT_ID
        )
    end
end

redis.call('set', 'sess_aid:' .. ACCOUNT_ID, UNICORN, 'px', SESSION_LIFETIME)
redis.call('set', 'unic_aid:' .. UNICORN, ACCOUNT_ID, 'px', SESSION_LIFETIME)