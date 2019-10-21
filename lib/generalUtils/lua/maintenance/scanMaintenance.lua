local WILDCARD_TO_SCAN = KEYS[1]

local the_scan_result = redis.call('scan', '0', 'match', WILDCARD_TO_SCAN, 'count', '1')

if #the_scan_result[2] > 0 then
    return '1'
else
    return nil
end