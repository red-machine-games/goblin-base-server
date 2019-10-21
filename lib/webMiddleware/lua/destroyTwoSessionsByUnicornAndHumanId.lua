local UNICORN = KEYS[1]
local HUMAN_ID = KEYS[2]
local SUBSESSION_ALSO = KEYS[3] == '1'

local unic_aid_1 = redis.call('get', 'unic_aid:' .. UNICORN)
local unic_hid_1 = redis.call('get', 'unic_hid:' .. UNICORN)

local sess_hid_2 = redis.call('get', 'sess_hid:' .. HUMAN_ID)
local unic_aid_2, unic_hid_2
if sess_hid_2 then
    unic_aid_2 = redis.call('get', 'unic_aid:' .. sess_hid_2)
    unic_hid_2 = redis.call('get', 'unic_hid:' .. sess_hid_2)
end

redis.call('del',
    'sess:' .. UNICORN, 'sexp:' .. UNICORN,
    'unic_aid:' .. UNICORN, 'unic_hid:' .. UNICORN,
    'sess_aid:' .. unic_aid_1, 'sess_hid:' .. unic_hid_1
)

if sess_hid_2 then
    redis.call('del', 'sess:' .. sess_hid_2, 'sexp:' .. sess_hid_2, 'unic_aid:' .. sess_hid_2, 'unic_hid:' .. sess_hid_2)
end
if unic_aid_2 or unic_hid_2 then
    redis.call('del', 'sess_aid:' .. unic_aid_2, 'sess_hid:' .. unic_hid_2)
end

if SUBSESSION_ALSO then
    redis.call('del', 'subs:' .. UNICORN)
end