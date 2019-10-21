local NOW = tonumber(KEYS[1])
local REFRESH_OCCUPATION_RELOADING = tonumber(KEYS[2])

local last_refresh_ts = redis.call('get', 'occ_refresh_ts')

if not last_refresh_ts or tonumber(last_refresh_ts) + REFRESH_OCCUPATION_RELOADING < NOW then
    redis.call('set', 'occ_refresh_ts', NOW)
    local the_occupation = redis.call('get', 'the_occupation')
    return the_occupation
else
    return nil
end