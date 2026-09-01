package com.foodie.restaurant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.infrastructure.storage.DocumentMagicBytes;
import org.junit.jupiter.api.Test;

class DocumentMagicBytesTest {

    @Test
    void detectsPdf() {
        byte[] header = "%PDF-1.7.....".getBytes();
        var detected = DocumentMagicBytes.detect(header, "application/pdf");
        assertThat(detected.contentType()).isEqualTo("application/pdf");
        assertThat(detected.extension()).isEqualTo("pdf");
    }

    @Test
    void rejectsWebpForDocuments() {
        byte[] header = new byte[] {
                'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P'
        };
        assertThatThrownBy(() -> DocumentMagicBytes.detect(header, "image/webp"))
                .isInstanceOf(BadRequestException.class)
                .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_FILE_TYPE);
    }
}
