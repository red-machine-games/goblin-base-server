local UNICORN = KEYS[1]
local SUBSESSION_ALSO = KEYS[2] == '1'

local unic_aid = redis.call('get', 'unic_aid:' .. UNICORN)
local unic_hid = redis.call('get', 'unic_hid:' .. UNICORN)

redis.call('del', 'sess:' .. UNICORN, 'sexp:' .. UNICORN, 'unic_aid:' .. UNICORN, 'unic_hid:' .. UNICORN)

if unic_aid then
    redis.call('del', 'sess_aid:' .. unic_aid)
end
if unic_hid then
   redis.call('del', 'sess_hid:' .. unic_hid)
end

if SUBSESSION_ALSO then
    redis.call('del', 'subs:' .. UNICORN)
end