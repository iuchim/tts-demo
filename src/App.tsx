import { type ChangeEvent, useRef, useState } from 'react'

interface VoiceType {
  provider: string
  lang: string
  fullname: string
  kind: string
  name: string
  sex: string
}

const voiceTable = createVoiceTable()

export function App() {
  const [googleAPIKey, setGoogleAPIKey] = useState('')
  const handleGoogleAPIKeyChange = (e: ChangeEvent<HTMLInputElement>) => setGoogleAPIKey(e.target.value)

  const [text, setText] = useState('まもなく、府中駅（こうえき）に、到着します')
  const handleTextChange = (e: ChangeEvent<HTMLInputElement>) => setText(e.target.value)

  const [selectedVoice, setSelectedVoice] = useState<VoiceType | undefined>(undefined)

  const [kind, setKind] = useState('')
  const handleKindChange = (e: ChangeEvent<HTMLSelectElement>) => setKind(e.target.value)

  const [sex, setSex] = useState('')
  const handleSexChange = (e: ChangeEvent<HTMLSelectElement>) => setSex(e.target.value)

  const [speakingRateStr, setSpeakingRateStr] = useState('100')
  const handleSpeakingRateChange = (e: ChangeEvent<HTMLInputElement>) => setSpeakingRateStr(e.target.value)
  const speakingRate = Math.min(2.0, Math.max(0.25, Number(speakingRateStr) / 100))

  const [pitchStr, setPitchStr] = useState('0')
  const handlePitchChange = (e: ChangeEvent<HTMLInputElement>) => setPitchStr(e.target.value)
  const pitch = Math.min(20.0, Math.max(-20.0, Number(pitchStr)))

  const [loading, setLoading] = useState(false)
  const btnDisabled = loading || !googleAPIKey.trim() || !text.trim() || selectedVoice == null

  const pitchDisabled = selectedVoice?.kind === 'Chirp3-HD'

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const filteredVoices = voiceTable.voices.filter((v) => {
    if (kind && v.kind !== kind) return false
    if (sex && v.sex !== sex) return false
    return true
  })

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const audioData = await callAPI(
        googleAPIKey.trim(),
        text.trim(),
        selectedVoice?.lang ?? '',
        selectedVoice?.fullname ?? '',
        pitchDisabled ? 0 : pitch,
        speakingRate,
      )
      if (audioRef.current == null) return
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = audioData
      await audioRef.current.play()
    } catch (err) {
      confirm(`エラーが発生しました\n${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-dvh w-full max-w-4xl grid-cols-1 gap-4 p-8">
      <h1 className="text-4xl">Text to Speech デモ</h1>

      <label className="input w-full">
        <span className="label">APIキー（Google）</span>
        <input type="password" autoComplete="off" value={googleAPIKey} onChange={handleGoogleAPIKeyChange} />
      </label>

      <label className="input w-full">
        <span className="label">テキスト</span>
        <input type="text" className="input" value={text} onChange={handleTextChange} />
      </label>

      <div className="flex w-full gap-4">
        <div className="flex grow items-center gap-2">
          <span className="label">速度</span>
          <input
            type="range"
            className="range range-secondary grow"
            min="50"
            max="200"
            step="5"
            value={speakingRateStr}
            onChange={handleSpeakingRateChange}
          />
          <span className="label inline-block w-16 text-right">{speakingRateStr} %</span>
        </div>

        <div className="flex grow items-center gap-2">
          <span className="label">音程</span>
          <input
            type="range"
            className="range range-secondary grow"
            min="-20"
            max="20"
            step="1"
            disabled={pitchDisabled}
            value={pitchDisabled ? '' : pitchStr}
            onChange={handlePitchChange}
          />
          <span className="label inline-block w-20 text-right">{pitchDisabled ? '0' : pitchStr} 半音</span>
        </div>
      </div>

      <div className="flex w-full gap-4">
        <span className="label">キャラクター</span>
        <span>
          {selectedVoice == null
            ? '選択されていません。画面下部のテーブルからキャラクターを選んでください'
            : `${selectedVoice.kind} | ${selectedVoice.name} | ${selectedVoice.sex === 'male' ? '男' : '女'}`}
        </span>
      </div>
      <button type="button" className="btn btn-primary" disabled={btnDisabled} onClick={handleSubmit}>
        再生
      </button>
      <div>
        {/** biome-ignore lint/a11y/useMediaCaption: ... */}
        <audio ref={audioRef} className="w-full" controls />
      </div>

      <h2 className="text-2xl">キャラクター選択</h2>
      <div className="flex gap-4">
        <label className="select">
          <span className="label">種別</span>
          <select value={kind} onChange={handleKindChange}>
            <option value="">ー</option>
            {voiceTable.kinds.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <label className="select">
          <span className="label">性別</span>
          <select value={sex} onChange={handleSexChange}>
            <option value="">ー</option>
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="table-pin-rows table">
          <thead>
            <tr>
              <th>種別</th>
              <th>名前</th>
              <th>性別</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {filteredVoices.map((v) => (
              <tr
                key={v.fullname}
                className={
                  v.fullname === selectedVoice?.fullname
                    ? 'bg-primary/10 font-bold'
                    : 'cursor-pointer hover:bg-base-200'
                }
                onClick={() => setSelectedVoice(v)}
              >
                <td>{v.kind}</td>
                <td>{v.name}</td>
                <td>{v.sex === 'male' ? '男' : '女'}</td>
                <td>{v.fullname}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const callAPICache: { body: string; data: string } = { body: '', data: '' }

async function callAPI(
  token: string,
  text: string,
  languageCode: string,
  name: string,
  pitch: number,
  speakingRate: number,
) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${token}`
  const body = JSON.stringify({
    input: {
      text,
    },
    voice: {
      name,
      languageCode,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate, // [0.25-2.0]
      pitch, // [-20.0-20.0]
    },
  })
  if (body !== callAPICache.body) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      if (!res.ok) {
        throw new Error(`status:${res.status}, body:${await res.text()}`)
      }
      const data = await res.json()
      if (data == null || typeof data !== 'object' || typeof data.audioContent !== 'string') {
        throw new Error('サーバーからの応答が想定外')
      }
      callAPICache.body = body
      callAPICache.data = data.audioContent
    } catch (err) {
      console.debug(err)
      throw err
    }
  }
  return `data:audio/mp3;base64,${callAPICache.data}`
}

function createVoiceTable() {
  const voices = googleVoices()
  const kindSet = new Set<string>()
  for (const v of voices) {
    kindSet.add(v.kind)
  }
  return {
    voices,
    kinds: [...kindSet.keys()].sort(),
  }
}

function googleVoices() {
  return [
    // { name: 'ja-JP-Chirp3-HD-Achernar', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Achird', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Algenib', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Algieba', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Alnilam', sex: 'male' },
    { name: 'ja-JP-Chirp3-HD-Aoede', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Autonoe', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Callirrhoe', sex: 'female' },
    { name: 'ja-JP-Chirp3-HD-Charon', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Despina', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Enceladus', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Erinome', sex: 'female' },
    { name: 'ja-JP-Chirp3-HD-Fenrir', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Gacrux', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Iapetus', sex: 'male' },
    { name: 'ja-JP-Chirp3-HD-Kore', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Laomedeia', sex: 'female' },
    { name: 'ja-JP-Chirp3-HD-Leda', sex: 'female' },
    { name: 'ja-JP-Chirp3-HD-Orus', sex: 'male' },
    { name: 'ja-JP-Chirp3-HD-Puck', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Pulcherrima', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Rasalgethi', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Sadachbia', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Sadaltager', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Schedar', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Sulafat', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Umbriel', sex: 'male' },
    // { name: 'ja-JP-Chirp3-HD-Vindemiatrix', sex: 'female' },
    { name: 'ja-JP-Chirp3-HD-Zephyr', sex: 'female' },
    // { name: 'ja-JP-Chirp3-HD-Zubenelgenubi', sex: 'male' },
    { name: 'ja-JP-Neural2-B', sex: 'female' },
    { name: 'ja-JP-Neural2-C', sex: 'male' },
    { name: 'ja-JP-Neural2-D', sex: 'male' },
    // { name: 'ja-JP-Standard-A', sex: 'female' },
    { name: 'ja-JP-Standard-B', sex: 'female' },
    { name: 'ja-JP-Standard-C', sex: 'male' },
    { name: 'ja-JP-Standard-D', sex: 'male' },
    // { name: 'ja-JP-Wavenet-A', sex: 'female' },
    { name: 'ja-JP-Wavenet-B', sex: 'female' },
    { name: 'ja-JP-Wavenet-C', sex: 'male' },
    { name: 'ja-JP-Wavenet-D', sex: 'male' },
  ]
    .map((o) => {
      const m = /^(\w+-\w+)-(.*)-(\w+)$/.exec(o.name)
      if (m == null) return null
      return {
        provider: 'Google',
        lang: m[1],
        fullname: o.name,
        kind: m[2],
        name: m[3],
        sex: o.sex,
      }
    })
    .filter((o) => o != null)
}
