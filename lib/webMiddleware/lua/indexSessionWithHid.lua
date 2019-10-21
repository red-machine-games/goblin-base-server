local UNICORN = KEYS[1]
local HUMAN_ID = KEYS[2]
local SESSION_LIFETIME = KEYS[3]

local existing_hid_index = redis.call('get', 'sess_hid:' .. HUMAN_ID)

if existing_hid_index and existing_hid_index ~= UNICORN then
    local unic_aid = redis.call('get', 'unic_aid:' .. existing_hid_index)
    if unic_aid then
        redis.call('del',
            'sess:' .. existing_hid_index, 'sexp:' .. existing_hid_index,
            'unic_aid:' .. existing_hid_index, 'sess_aid:' .. unic_aid,
            'unic_hid:' .. existing_hid_index, 'sess_hid:' .. HUMAN_ID
        )
    else
        redis.call('del',
            'sess:' .. existing_hid_index, 'sexp:' .. existing_hid_index,
            'unic_hid:' .. existing_hid_index, 'sess_hid:' .. HUMAN_ID
        )
    end
end

redis.call('set', 'sess_hid:' .. HUMAN_ID, UNICORN, 'px', SESSION_LIFETIME)
redis.call('set', 'unic_hid:' .. UNICORN, HUMAN_ID, 'px', SESSION_LIFETIME)