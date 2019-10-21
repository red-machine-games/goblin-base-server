local BOOKING_KEY = KEYS[1]

local prid_and_pid = redis.call('hmget', 'pinx:' .. BOOKING_KEY, 'prid', 'pid')
local prid = prid_and_pid[1]
local pid = prid_and_pid[2]
local paused = '0'
local pause_ts = ';-1'
local unpause_ts = ';-1'
local target_player_turn = ';-1'

if prid then
    local pair_key = 'pair:' .. prid
    local pair = redis.call('hmget', pair_key, 'pida', 'pseda', 'psedb')
    paused = (pair[1] == pid) and (pair[3] == '1'  and '1' or '0') or (pair[2] == '1'  and '1' or '0')
    local _pts = redis.call('hmget', pair_key, 'psedrects', 'upsedrects')
    if _pts[1] then
        pause_ts = ';' .. _pts[1]
    end
    if _pts[2] then
        unpause_ts = ';' .. _pts[2]
    end
    local target_tur = redis.call('hget', pair_key, (pair[1] == pid) and 'turb' or 'tura')
    if target_tur then
        target_player_turn = ';' .. target_tur
    end
end

return paused .. pause_ts .. unpause_ts .. target_player_turn