redis.replicate_commands()

local NOW = tonumber(KEYS[1])
local RELOADING_MS = tonumber(KEYS[2])
local BATCH_SIZE = tonumber(KEYS[3])
local TIME_FOR_SEARCH = tonumber(KEYS[4])
local TIME_FOR_ACCEPTANCE = tonumber(KEYS[5])
local GAMEROOM_BOOKING_TTL = tonumber(KEYS[6])
local PLAYER_IN_GAMEROOM_TTL = tonumber(KEYS[7])
local TARGET_PID = KEYS[8]

local pids_deleted = {}

local function process_key(key)
    local qplr = redis.call('hmget', key, 'stat', 'upd', 'segm', 'pid')
    if qplr[1] == '0' then
        if tonumber(qplr[2]) + TIME_FOR_SEARCH <= NOW then
            redis.call('zrem', 'sq:' .. qplr[3], qplr[4])
            redis.call('del', key)
            table.insert(pids_deleted, qplr[4])
            return qplr[4] == TARGET_PID
        end
    elseif qplr[1] == '1' or qplr[1] == '2' then
        if tonumber(qplr[2]) + TIME_FOR_ACCEPTANCE <= NOW then
            local opponent = redis.call('hmget', key, 'opp', 'opbot')
            if opponent[2] ~= '1' then
                redis.call('del', key, 'qplr:' .. opponent[1])
                table.insert(pids_deleted, opponent[1])
            else
                redis.call('del', key)
            end
            table.insert(pids_deleted, qplr[4])
            return qplr[4] == TARGET_PID
        end
    elseif qplr[1] == '3' or qplr[1] == '4' then
        if (qplr[1] == '3') or (qplr[1] == '4' and ((tonumber(qplr[2]) + PLAYER_IN_GAMEROOM_TTL) <= NOW)) then
            local ip_and_mm_key = redis.call('hmget', key, 'grip', 'ky')
            local opponent = redis.call('hmget', key, 'opp', 'opbot')
            if opponent[2] == '1' then
                opponent = nil
            else
                opponent = opponent[1]
            end
            local opponent_mm_key
            if opponent then
                opponent_mm_key = redis.call('hget', 'qplr:' .. opponent, 'ky')
            end
            local booking_stat = redis.call('hmget', 'grmb:' .. ip_and_mm_key[1] .. ':' .. ip_and_mm_key[2], 'stat', 'upd')
            if booking_stat[1] == '0' then
                if tonumber(booking_stat[2]) + GAMEROOM_BOOKING_TTL <= NOW then
                    if opponent then
                        if opponent_mm_key then
                            redis.call(
                                    'del', 'grmb:' .. ip_and_mm_key[1] .. ':' .. ip_and_mm_key[2],
                                    'grmb:' .. ip_and_mm_key[1] .. ':' .. opponent_mm_key,
                                    key, 'qplr:' .. opponent
                            )
                        else
                            redis.call('del', 'grmb:' .. ip_and_mm_key[1] .. ':' .. ip_and_mm_key[2], key, 'qplr:' .. opponent)
                        end
                        table.insert(pids_deleted, opponent)
                        table.insert(pids_deleted, qplr[4])
                    else
                        redis.call('del', 'grmb:' .. ip_and_mm_key[1] .. ':' .. ip_and_mm_key[2], key)
                        table.insert(pids_deleted, qplr[4])
                    end
                    return qplr[4] == TARGET_PID
                end
            elseif opponent then
                if opponent_mm_key then
                    local opponent_booking_stat = redis.call('hmget', 'grmb:' .. ip_and_mm_key[1] .. ':' .. opponent_mm_key, 'stat', 'upd')
                    if opponent_booking_stat[1] == '0' and tonumber(opponent_booking_stat[2]) + GAMEROOM_BOOKING_TTL <= NOW then
                        redis.call('del', key, 'qplr:' .. opponent, 'grmb:' .. ip_and_mm_key[1] .. ':' .. opponent_mm_key)
                        table.insert(pids_deleted, opponent)
                        table.insert(pids_deleted, qplr[4])
                        return qplr[4] == TARGET_PID
                    else
                        redis.call('del', key, 'qplr:' .. opponent)
                        table.insert(pids_deleted, opponent)
                        table.insert(pids_deleted, qplr[4])
                        return qplr[4] == TARGET_PID
                    end
                else
                    redis.call('del', key, 'qplr:' .. opponent)
                    table.insert(pids_deleted, opponent)
                    table.insert(pids_deleted, qplr[4])
                    return qplr[4] == TARGET_PID
                end
            else
                redis.call('del', key)
                table.insert(pids_deleted, qplr[4])
                return qplr[4] == TARGET_PID
            end
        end
    end
end
local function update_grooms()
    local prev_update_ts = redis.call('get', 'grm_upd_scan_ts')

    if not prev_update_ts or tonumber(prev_update_ts) + RELOADING_MS <= NOW then
        local grooms = redis.call('zrange', 'grooms', 0, -1)

        for i=1, #grooms, 1 do
            local particular_ttl_index = redis.call('get', 'groomttl:' .. grooms[i])

            if not particular_ttl_index then
                redis.call('zrem', 'grooms', grooms[i])
            end
        end

        redis.call('set', 'grm_upd_scan_ts', NOW)
    end
end

update_grooms()

local target_pid_affected = process_key('qplr:' .. TARGET_PID)

local prev_scan_ts = redis.call('get', 'qplr_scan_ts')

if not prev_scan_ts or tonumber(prev_scan_ts) + RELOADING_MS <= NOW then
    local a_cursor = redis.call('get', 'qplr_scan_cur')
    if a_cursor then
        a_cursor = tonumber(a_cursor)
    else
        a_cursor = 0
    end

    local sc = redis.call('scan', a_cursor, 'match', 'qplr:*', 'count', BATCH_SIZE)

    redis.call('set', 'qplr_scan_cur', sc[1])
    redis.call('set', 'qplr_scan_ts', NOW)

    for i=1, #sc[2], 1 do
        process_key(sc[2][i])
    end
end

if #pids_deleted > 0 then
    for i=1, #pids_deleted, 1 do
        if pids_deleted[i] ~= TARGET_PID then
            redis.call('publish', 'mm-pub', pids_deleted[i] .. '//5')
        end
    end
end

return target_pid_affected and 1 or nil