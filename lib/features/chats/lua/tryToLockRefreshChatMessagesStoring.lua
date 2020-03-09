
local NOW = KEYS[1]
local PACKAGE_TIMEOUT = tonumber(KEYS[2])

local the_lock = redis.call('get', 'chat:ref_lock')

if the_lock and tonumber(NOW) - tonumber(the_lock) < PACKAGE_TIMEOUT then
    return nil
end

redis.call('set', 'chat:ref_lock', NOW, 'PX', PACKAGE_TIMEOUT)
return '1'