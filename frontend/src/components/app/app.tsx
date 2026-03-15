import { usePlayerStore } from "@/hooks/usePlayer"
import EditPlaylists from "@/pages/EditPlaylists"
import Home from "@/pages/Home"
import NowPlaying from "@/pages/NowPlaying"
import Playlists from "@/pages/Playlists"
import Queue from "@/pages/Queue"
import { useEffect } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import AudioPlayer from "../audio-player/audio-player"
import Background from "../background/background"
import Navbar from "../navbar/navbar"

export default function App() {
    const initialize = usePlayerStore((s) => s.initialize)

    useEffect(() => {
        initialize()
    }, [initialize])

    return (
        <BrowserRouter>
            <section>
                <Navbar />
                <Background />
                <main className='pt-22'>
                    <Routes>
                        <Route path='/' element={<Home />} />
                        <Route path='/playlists' element={<Playlists />} />
                        <Route path='/playlists/edit' element={<EditPlaylists />} />
                        <Route path='/queue' element={<Queue />} />
                        <Route path='/now-playing' element={<NowPlaying />} />
                    </Routes>
                </main>
                <AudioPlayer />
                <ToastContainer
                    position='bottom-right'
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme='light'
                />
            </section>
        </BrowserRouter>
    )
}
