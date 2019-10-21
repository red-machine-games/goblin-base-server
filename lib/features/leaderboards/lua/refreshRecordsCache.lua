redis.replicate_commands()

local LAST_FROM = tonumber(table.remove(KEYS, 1))
local MY_LOCK_KEY = table.remove(KEYS, 1)
local NOW = tonumber(table.remove(KEYS, 1))
local OPERATIVE_RECORD_LIFETIME_MS = table.remove(KEYS, 1)

local refresh = redis.call('hmget', 'refreshl', 'locked', 'lock_key')

if refresh[1] ~= false and refresh[1] == '1' and refresh[2] == MY_LOCK_KEY then
    if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
        local block_lti_scan = redis.call('get', 'block_lti_scan')
        local block_lti_scan_vk = redis.call('get', 'block_lti_scan_vk')
        local block_lti_scan_fb = redis.call('get', 'block_lti_scan_fb')
        local block_lti_scan_ok = redis.call('get', 'block_lti_scan_ok')

        if not block_lti_scan then
            local segm_scan_tab = redis.call('hgetall', 'segm_scan_tab')
            local counter_lol = 0
            if not segm_scan_tab or #segm_scan_tab == 0 then
                local segm_scan = redis.call('get', 'segm_scan') or '0'
                local segm_scan_out = redis.call('scan', segm_scan, 'match', 'rc:*', 'count', 20)

                segm_scan_tab = {}
                for i = 1, #segm_scan_out[2], 1 do
                    local le_segment = segm_scan_out[2][i]:gsub('rc:', '')
                    redis.call('hset', 'segm_scan_tab', le_segment, '0')
                    segm_scan_tab[le_segment] = 0;
                    counter_lol = counter_lol + 1
                end
                if segm_scan_out[1] == '0' then
                    redis.call('set', 'block_lti_scan', '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
                    redis.call('del', 'segm_scan', 'segm_scan_tab')
                else
                    redis.call('set', 'segm_scan', segm_scan_out[1])
                end
            else
                local _segm_scan_tab = {}
                for i = 1, #segm_scan_tab, 2 do
                    _segm_scan_tab[segm_scan_tab[i]] = segm_scan_tab[i + 1]
                    counter_lol = counter_lol + 1
                end
                segm_scan_tab = _segm_scan_tab
            end
            if counter_lol > 0 then
                for k, v in pairs(segm_scan_tab) do
                    local zset_key = 'rc:' .. k
                    local lti_scan = redis.call('zscan', zset_key, v, 'count', 50)
                    for i = 1, #lti_scan[2], 1 do
                        local pid = lti_scan[2][i]
                        local lti = redis.call('get', 'rclti:' .. k .. ':p' .. pid)
                        if not lti then
                            redis.call('zrem', zset_key, pid)
                            redis.call('del', 'clrc:' .. pid .. ':' .. k)
                        end
                    end
                    if lti_scan[1] == '0' then
                        segm_scan_tab[k] = nil
                        counter_lol = counter_lol - 1
                        redis.call('hdel', 'segm_scan_tab', k)
                    else
                        segm_scan_tab[k] = lti_scan[1]
                        redis.call('hset', 'segm_scan_tab', k, v)
                    end
                end
            end
        end
        if not block_lti_scan_vk then
            local vkrc_scan = redis.call('get', 'vkrc_scan') or '0'
            local vkrc_scan_out = redis.call('scan', vkrc_scan, 'match', 'vkrc:*:*', 'count', 50)
            if vkrc_scan_out[1] == '0' then
                redis.call('del', 'vkrc_scan')
                redis.call('set', 'block_lti_scan_vk', '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
            else
                redis.call('set', 'vkrc_scan', vkrc_scan_out[1])
            end
            for i = 1, #vkrc_scan_out[2], 1 do
                local rc_key = vkrc_scan_out[2][i]
                local prefix_vk_segment = rc_key:split(':')
                local lti = redis.call('get', 'rclti:' .. prefix_vk_segment[3] .. ':vk' .. prefix_vk_segment[2])
                if not lti then
                    redis.call('del', rc_key)
                end
            end
        end
        if not block_lti_scan_fb then
            local fbrc_scan = redis.call('get', 'fbrc_scan') or '0'
            local fbrc_scan_out = redis.call('scan', fbrc_scan, 'match', 'fbrc:*:*', 'count', 50)
            if fbrc_scan_out[1] == '0' then
                redis.call('del', 'fbrc_scan')
                redis.call('set', 'block_lti_scan_fb', '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
            else
                redis.call('set', 'fbrc_scan', fbrc_scan_out[1])
            end
            for i = 1, #fbrc_scan_out[2], 1 do
                local rc_key = fbrc_scan_out[2][i]
                local prefix_fb_segment = rc_key:split(':')
                local lti = redis.call('get', 'rclti:' .. prefix_fb_segment[3] .. ':fb' .. prefix_fb_segment[2])
                if not lti then
                    redis.call('del', rc_key)
                end
            end
        end
        if not block_lti_scan_ok then
            local okrc_scan = redis.call('get', 'okrc_scan') or '0'
            local okrc_scan_out = redis.call('scan', okrc_scan, 'match', 'okrc:*:*', 'count', 50)
            if okrc_scan_out[1] == '0' then
                redis.call('del', 'okrc_scan')
                redis.call('set', 'block_lti_scan_ok', '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
            else
                redis.call('set', 'okrc_scan', okrc_scan_out[1])
            end
            for i = 1, #okrc_scan_out[2], 1 do
                local rc_key = okrc_scan_out[2][i]
                local prefix_ok_segment = rc_key:split(':')
                local lti = redis.call('get', 'rclti:' .. prefix_ok_segment[3] .. ':ok' .. prefix_ok_segment[2])
                if not lti then
                    redis.call('del', rc_key)
                end
            end
        end
    end

    if #KEYS > 0 then
        for i = 1, #KEYS, 6 do
            local PID = KEYS[i]
            local VALUE = KEYS[i + 1]
            local SEGMENT = KEYS[i + 2]
            local VK = KEYS[i + 3]
            local FB = KEYS[i + 4]
            local OK = KEYS[i + 5]

            redis.call('zadd', 'rc:' .. SEGMENT, VALUE, PID)
            if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                redis.call('set', 'rclti:' .. SEGMENT .. ':p' .. PID, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
            end

            if VK ~= '-1' then
                redis.call('set', 'vkrc:' .. VK .. ':' .. SEGMENT, VALUE)
                if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                    redis.call('set', 'rclti:' .. SEGMENT .. ':vk' .. VK, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
                end
            end
            if FB ~= '-1' then
                redis.call('set', 'fbrc:' .. FB .. ':' .. SEGMENT, VALUE)
                if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                    redis.call('set', 'rclti:' .. SEGMENT .. ':fb' .. FB, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
                end
            end
            if OK ~= '-1' then
                redis.call('set', 'okrc:' .. OK .. ':' .. SEGMENT, VALUE)
                if OPERATIVE_RECORD_LIFETIME_MS ~= '0' then
                    redis.call('set', 'rclti:' .. SEGMENT .. ':ok' .. OK, '1', 'px', OPERATIVE_RECORD_LIFETIME_MS)
                end
            end
        end
        local refresh_to = redis.call('hget', 'refreshl', 'to')
        if LAST_FROM >= tonumber(refresh_to) then
            redis.call('hmset', 'refreshl', 'from', '0', 'to', '0', 'now', tostring(NOW), 'locked', '0')
            redis.call('hmset', 'seedl', 'seed_to', tostring(refresh_to))
        else
            redis.call('hmset', 'refreshl', 'from', tostring(LAST_FROM), 'now', tostring(NOW), 'locked', '0')
        end
    else
        redis.call('hmset', 'refreshl', 'from', tostring(LAST_FROM), 'now', tostring(NOW), 'locked', '0')
    end
    return 1
else
    return 0
end
