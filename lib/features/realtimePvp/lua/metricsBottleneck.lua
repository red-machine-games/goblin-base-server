redis.replicate_commands()

local CALLER_PID = KEYS[1]
local CALLER_ACTIVE_WEBSOCKETS = KEYS[2]
local CALLER_EVENT_LOOP_LAG = KEYS[3]
local AMOUNT_OF_PIDNX_KEYS_TO_SCAN = KEYS[4]
local REPORT_LIFETIME = KEYS[5]
local LOCK_LIFETIME = KEYS[6]

local all_websocket_reports = redis.call('hgetall', 'metrics_wsc')
local websockets_count_to_return = CALLER_ACTIVE_WEBSOCKETS

if all_websocket_reports and #all_websocket_reports > 0 then
    for i=1, #all_websocket_reports, 2 do
        local the_pid, the_count = all_websocket_reports[i], all_websocket_reports[i + 1]
        local lt = redis.call('get', 'metrics_wsc_lt_' .. the_pid)
        if not lt then
            redis.call('hdel', 'metrics_wsc', the_pid)
        elseif the_pid ~= CALLER_PID then
            websockets_count_to_return = websockets_count_to_return + tonumber(the_count)
        end
    end
end

redis.call('hset', 'metrics_wsc', CALLER_PID, CALLER_ACTIVE_WEBSOCKETS)
redis.call('set', 'metrics_wsc_lt_' .. CALLER_PID, '1', 'px', REPORT_LIFETIME)

local all_lag_reports = redis.call('hgetall', 'metrics_lag')
local average_lag_to_return = CALLER_EVENT_LOOP_LAG

if all_lag_reports and #all_lag_reports > 0 then
    local avg_counter = 1
    for i=1, #all_lag_reports, 2 do
        local the_pid, the_lag = all_lag_reports[i], all_lag_reports[i + 1]
        local lt = redis.call('get', 'metrics_lag_lt_' .. the_pid)
        if not lt then
            redis.call('hdel', 'metrics_lag', the_pid)
        elseif the_pid ~= CALLER_PID then
            average_lag_to_return = average_lag_to_return + the_lag
            avg_counter = avg_counter + 1
        end
    end
    average_lag_to_return = math.ceil(average_lag_to_return / avg_counter)
end

redis.call('hset', 'metrics_lag', CALLER_PID, CALLER_EVENT_LOOP_LAG)
redis.call('set', 'metrics_lag_lt_' .. CALLER_PID, '1', 'px', REPORT_LIFETIME)

local pidnx_scan_cursor = redis.call('get', 'metrics_pidnx_scan') or '0'
local pidnx_amount = tonumber(redis.call('get', 'metrics_pidnx_amount') or '0')
local pidnx_to_return

local so_the_scan = redis.call('scan', pidnx_scan_cursor, 'match', 'pidnx:*', 'count', AMOUNT_OF_PIDNX_KEYS_TO_SCAN)
if so_the_scan[1] == '0' then
    redis.call('del', 'metrics_pidnx_scan', 'metrics_pidnx_amount')
    pidnx_to_return = tostring(pidnx_amount + #so_the_scan[2])
else
    redis.call('set', 'metrics_pidnx_scan', so_the_scan[1])
    redis.call('set', 'metrics_pidnx_amount', pidnx_amount + #so_the_scan[2])
    pidnx_to_return = '-1'
end

local metrics_lock = redis.call('get', 'metrics_lock')
if not metrics_lock then
    redis.call('set', 'metrics_lock', '1', 'px', LOCK_LIFETIME)
    return websockets_count_to_return .. ';' .. redis.call('get', 'the_occupation') .. ';' .. pidnx_to_return .. ';' .. average_lag_to_return
else
    return nil
end