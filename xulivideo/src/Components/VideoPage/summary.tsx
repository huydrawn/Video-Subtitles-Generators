import React, { useState } from 'react';
import { Input, Button, Typography, Layout, Select } from 'antd';
const { Title } = Typography;
const { Content } = Layout;

const SummaryPage: React.FC = () => {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [numLines, setNumLines] = useState(7);
    const [summary, setSummary] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setYoutubeUrl(e.target.value);
    };

    const handleNumLinesChange = (value: any) => {
        setNumLines(value);
    };

    const summarizeVideo = async () => {
        // Placeholder for your summarization logic
        // Replace this with an actual API call to a summarization service
        // that takes a YouTube URL and the number of lines as input.
        console.log('Summarizing video with URL:', youtubeUrl, 'and lines:', numLines);
        setSummary('Summary is being generated...'); // Indicate loading

        // Simulate an API call with a timeout
        setTimeout(() => {
            const mockSummary = `This is a mock summary of the video. It has ${numLines} lines of text.  Replace this logic with a call to your summarization API.`;
            setSummary(mockSummary.repeat(numLines)); // Mock summary
        }, 2000);
    };

    return (
        <Layout>
            <Content style={{ padding: '0 50px', marginTop: 20 }}>
                <div style={{ background: '#fff', padding: 24, minHeight: 280, textAlign: 'center' }}>
                    <Title level={2}>Brief Me</Title>
                    <p>Just enter the URL of any YouTube video and get a summary within a few seconds.</p>

                    <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={handleInputChange}
                        style={{ marginBottom: 16, width: '100%', maxWidth: 500 }} // Make input take full width on small screens
                    />

                    <div>
                        <label htmlFor="numLines">No. of lines: </label>
                        <Select
                            id="numLines"
                            value={numLines}
                            onChange={handleNumLinesChange}
                            style={{ margin: '0 10px', width: 120 }} // Adjust width as needed
                        >
                            {[5, 6, 7, 8, 9, 10].map((num) => (
                                <Select.Option key={num} value={num}>
                                    {num}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    <Button type="primary" onClick={summarizeVideo} style={{ marginTop: 16 }}>
                        Summarize
                    </Button>

                    {summary && (
                        <div style={{ marginTop: 24, textAlign: 'left' }}>
                            <Title level={4}>Summary:</Title>
                            <p>{summary}</p>
                        </div>
                    )}
                </div>
            </Content>
        </Layout>
    );
};

export default SummaryPage;